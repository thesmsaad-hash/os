/**
 * Personal OS — Google Apps Script Backend
 * 
 * Features:
 * - API Key authentication on all endpoints
 * - Concurrency control with LockService
 * - Structured versioned JSON envelopes for collections
 * - Automatic folder & collection initialization
 * - Drive file upload handler
 * - ntfy push notification integration
 * - Backup snapshots
 */

// Default Configuration (Can also be set in Script Properties: API_KEY, NTFY_TOPIC, NTFY_TOKEN)
const DEFAULT_API_KEY = "personal_os_secret_key_2026";
const ROOT_FOLDER_NAME = "Personal OS";
const DATA_FOLDER_NAME = "data";
const UPLOADS_FOLDER_NAME = "uploads";
const BACKUPS_FOLDER_NAME = "backups";

const COLLECTIONS = [
  "users",
  "tasks",
  "projects",
  "events",
  "notes",
  "whiteboards",
  "habits",
  "journal",
  "goals",
  "focus",
  "bookmarks",
  "finance",
  "notifications",
  "widgets"
];

/**
 * Validates request API Key
 */
function authenticate(apiKey) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const configuredKey = scriptProperties.getProperty("API_KEY") || DEFAULT_API_KEY;
  return Boolean(apiKey && apiKey.trim() === configuredKey.trim());
}

/**
 * Standard JSON Response Helper
 */
function jsonResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * GET Handler — Health check & simple reads
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || "health";
    const apiKey = params.apiKey || "";

    if (action === "health") {
      return jsonResponse({
        status: "ok",
        service: "Personal OS Google Apps Script API",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      });
    }

    if (!authenticate(apiKey)) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid API key" }, 401);
    }

    if (action === "readCollection") {
      const collection = params.collection;
      if (!collection) {
        return jsonResponse({ success: false, error: "Missing collection name" }, 400);
      }
      const data = readCollectionFile(collection);
      return jsonResponse({ success: true, collection, data });
    }

    return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

/**
 * POST Handler — All mutation and authenticated requests
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action || "health";
    const apiKey = payload.apiKey || "";

    if (action === "health") {
      return jsonResponse({
        status: "ok",
        service: "Personal OS Google Apps Script API",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      });
    }

    if (!authenticate(apiKey)) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid API key" }, 401);
    }

    switch (action) {
      case "init":
        return jsonResponse(initStorage());

      case "readCollection":
        return jsonResponse(handleReadCollection(payload.collection));

      case "writeCollection":
        return jsonResponse(handleWriteCollection(payload.collection, payload.items, payload.metadata));

      case "updateItem":
        return jsonResponse(handleUpdateItem(payload.collection, payload.item, payload.operation));

      case "uploadFile":
        return jsonResponse(handleUploadFile(payload.folder || "attachments", payload.fileName, payload.mimeType, payload.base64Data));

      case "createBackup":
        return jsonResponse(handleCreateBackup());

      case "triggerNtfy":
        return jsonResponse(handleTriggerNtfy(payload));

      case "getGoogleCalendarEvents":
        return jsonResponse(handleGetGoogleCalendarEvents(payload.startDate, payload.endDate));

      case "createGoogleCalendarEvent":
        return jsonResponse(handleCreateGoogleCalendarEvent(payload.event));

      case "syncGoogleCalendar":
        return jsonResponse(handleSyncGoogleCalendar(payload.events, payload.startDate, payload.endDate));

      default:
        return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// ── Google Drive Folder & File Operations ──────────────────────────────────────

/**
 * Get or create root and subfolders in Drive
 */
function getFolders() {
  let rootFolder;
  const rootIter = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (rootIter.hasNext()) {
    rootFolder = rootIter.next();
  } else {
    rootFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
  }

  function getSubfolder(parent, name) {
    const iter = parent.getFoldersByName(name);
    return iter.hasNext() ? iter.next() : parent.createFolder(name);
  }

  const dataFolder = getSubfolder(rootFolder, DATA_FOLDER_NAME);
  const uploadsFolder = getSubfolder(rootFolder, UPLOADS_FOLDER_NAME);
  const backupsFolder = getSubfolder(rootFolder, BACKUPS_FOLDER_NAME);

  // Subfolders for uploads
  getSubfolder(uploadsFolder, "images");
  getSubfolder(uploadsFolder, "documents");
  getSubfolder(uploadsFolder, "attachments");

  return { rootFolder, dataFolder, uploadsFolder, backupsFolder };
}

/**
 * Initializes storage structure and missing collection files
 */
function initStorage() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const { rootFolder, dataFolder } = getFolders();
    const initializedFiles = [];

    COLLECTIONS.forEach(col => {
      const fileName = `${col}.json`;
      const files = dataFolder.getFilesByName(fileName);
      if (!files.hasNext()) {
        const envelope = {
          version: 1,
          collection: col,
          updatedAt: new Date().toISOString(),
          items: []
        };
        dataFolder.createFile(fileName, JSON.stringify(envelope, null, 2), MimeType.PLAIN_TEXT);
        initializedFiles.push(fileName);
      }
    });

    return {
      success: true,
      message: "Personal OS Drive storage initialized successfully",
      rootFolderId: rootFolder.getId(),
      initializedFiles,
      allCollections: COLLECTIONS
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reads a collection JSON file with structured envelope
 */
function readCollectionFile(collection) {
  const { dataFolder } = getFolders();
  const fileName = `${collection}.json`;
  const files = dataFolder.getFilesByName(fileName);

  if (!files.hasNext()) {
    return {
      version: 1,
      collection,
      updatedAt: new Date().toISOString(),
      items: []
    };
  }

  const file = files.next();
  const content = file.getBlob().getDataAsString();
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.items)) {
      return parsed;
    }
    // Convert legacy array if any
    return {
      version: 1,
      collection,
      updatedAt: new Date().toISOString(),
      items: Array.isArray(parsed) ? parsed : []
    };
  } catch (e) {
    return {
      version: 1,
      collection,
      updatedAt: new Date().toISOString(),
      items: [],
      error: "Corrupted JSON reset to empty"
    };
  }
}

/**
 * Handler for readCollection
 */
function handleReadCollection(collection) {
  if (!collection) return { success: false, error: "Missing collection parameter" };
  const data = readCollectionFile(collection);
  return { success: true, collection, data };
}

/**
 * Handler for writeCollection with LockService and version bump
 */
function handleWriteCollection(collection, items, metadata = {}) {
  if (!collection) return { success: false, error: "Missing collection parameter" };
  if (!Array.isArray(items)) return { success: false, error: "Items must be an array" };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const { dataFolder } = getFolders();
    const fileName = `${collection}.json`;
    const files = dataFolder.getFilesByName(fileName);

    let currentVersion = 0;
    let targetFile;

    if (files.hasNext()) {
      targetFile = files.next();
      try {
        const raw = targetFile.getBlob().getDataAsString();
        const parsed = JSON.parse(raw);
        currentVersion = (parsed && typeof parsed.version === "number") ? parsed.version : 0;
      } catch (e) {}
    }

    const envelope = {
      version: currentVersion + 1,
      collection,
      updatedAt: new Date().toISOString(),
      metadata,
      items
    };

    const jsonStr = JSON.stringify(envelope, null, 2);

    if (targetFile) {
      targetFile.setContent(jsonStr);
    } else {
      dataFolder.createFile(fileName, jsonStr, MimeType.PLAIN_TEXT);
    }

    return {
      success: true,
      collection,
      version: envelope.version,
      updatedAt: envelope.updatedAt,
      itemCount: items.length
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handler for atomic updateItem (upsert or delete single record)
 */
function handleUpdateItem(collection, item, operation = "upsert") {
  if (!collection || !item || !item.id) {
    return { success: false, error: "Missing collection or item with valid id" };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const current = readCollectionFile(collection);
    let items = current.items || [];

    if (operation === "delete") {
      items = items.filter(i => i.id !== item.id);
    } else {
      // Upsert
      const now = new Date().toISOString();
      const idx = items.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...item, updatedAt: now };
      } else {
        items.unshift({ ...item, createdAt: item.createdAt || now, updatedAt: now });
      }
    }

    return handleWriteCollection(collection, items);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handler for file uploads to uploads/ subfolder
 */
function handleUploadFile(subfolderName, fileName, mimeType, base64Data) {
  if (!fileName || !base64Data) {
    return { success: false, error: "Missing fileName or base64Data" };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const { uploadsFolder } = getFolders();
    let targetFolder = uploadsFolder;

    const subIter = uploadsFolder.getFoldersByName(subfolderName);
    if (subIter.hasNext()) {
      targetFolder = subIter.next();
    }

    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType || MimeType.OCTET_STREAM, fileName);
    const file = targetFolder.createFile(blob);

    return {
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      size: file.getSize(),
      mimeType: file.getMimeType(),
      url: file.getUrl(),
      downloadUrl: file.getDownloadUrl()
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handler for full Drive backup snapshot
 */
function handleCreateBackup() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const { dataFolder, backupsFolder } = getFolders();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupSnapshot = {
      backupTimestamp: new Date().toISOString(),
      collections: {}
    };

    COLLECTIONS.forEach(col => {
      backupSnapshot.collections[col] = readCollectionFile(col);
    });

    const backupFileName = `backup-${timestamp}.json`;
    const file = backupsFolder.createFile(
      backupFileName,
      JSON.stringify(backupSnapshot, null, 2),
      MimeType.PLAIN_TEXT
    );

    return {
      success: true,
      backupFileId: file.getId(),
      backupFileName,
      timestamp: backupSnapshot.backupTimestamp
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Trigger ntfy notification from Google Apps Script
 */
function handleTriggerNtfy(payload) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const defaultTopic = scriptProperties.getProperty("NTFY_TOPIC") || "personal-os-saad";
  const defaultToken = scriptProperties.getProperty("NTFY_TOKEN") || "";

  const topic = payload.topic || defaultTopic;
  const token = payload.token || defaultToken;
  const message = payload.message || "Notification from Personal OS";
  const title = payload.title || "Personal OS Alert";
  const priority = payload.priority || 3;
  const tags = payload.tags || ["bell"];

  const url = "https://ntfy.sh/" + encodeURIComponent(topic);
  const headers = {
    "Title": title,
    "Priority": String(priority),
    "Tags": Array.isArray(tags) ? tags.join(",") : String(tags)
  };

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const options = {
    method: "post",
    headers: headers,
    payload: message,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  return {
    success: response.getResponseCode() >= 200 && response.getResponseCode() < 300,
    statusCode: response.getResponseCode(),
    responseBody: response.getContentText()
  };
}

// ── Google Calendar Integration ───────────────────────────────────────────────

/**
 * Reads Google Calendar events within a date range
 */
function handleGetGoogleCalendarEvents(startDateStr, endDateStr) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const start = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDateStr ? new Date(endDateStr) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const googleEvents = calendar.getEvents(start, end);
    const events = googleEvents.map(ev => {
      const isAllDay = ev.isAllDayEvent();
      const startTime = ev.getStartTime();
      const endTime = ev.getEndTime();
      const dateStr = Utilities.formatDate(startTime, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const startTimeStr = Utilities.formatDate(startTime, Session.getScriptTimeZone(), "HH:mm");
      const endTimeStr = Utilities.formatDate(endTime, Session.getScriptTimeZone(), "HH:mm");

      return {
        id: "gcal_" + ev.getId().replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30),
        googleEventId: ev.getId(),
        title: ev.getTitle(),
        description: ev.getDescription() || "",
        location: ev.getLocation() || "",
        date: dateStr,
        startTime: isAllDay ? undefined : startTimeStr,
        endTime: isAllDay ? undefined : endTimeStr,
        isAllDay: isAllDay,
        color: "blue",
        category: "google",
        source: "google_calendar"
      };
    });

    return {
      success: true,
      count: events.length,
      calendarName: calendar.getName(),
      timeZone: Session.getScriptTimeZone(),
      events: events
    };
  } catch (err) {
    return { success: false, error: "Google Calendar read failed: " + err.toString() };
  }
}

/**
 * Creates an event in the user's primary Google Calendar
 */
function handleCreateGoogleCalendarEvent(eventData) {
  try {
    if (!eventData || !eventData.title) {
      return { success: false, error: "Missing event title" };
    }

    const calendar = CalendarApp.getDefaultCalendar();
    let created;

    if (eventData.isAllDay || !eventData.startTime) {
      const d = eventData.date ? new Date(eventData.date) : new Date();
      created = calendar.createAllDayEvent(eventData.title, d, {
        description: eventData.description || "Created from Personal OS",
        location: eventData.location || ""
      });
    } else {
      const startStr = `${eventData.date}T${eventData.startTime}:00`;
      const endStr = eventData.endTime ? `${eventData.date}T${eventData.endTime}:00` : `${eventData.date}T${eventData.startTime}:00`;
      const start = new Date(startStr);
      let end = new Date(endStr);
      if (end <= start) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }

      created = calendar.createEvent(eventData.title, start, end, {
        description: eventData.description || "Created from Personal OS",
        location: eventData.location || ""
      });
    }

    return {
      success: true,
      googleEventId: created.getId(),
      title: created.getTitle(),
      startTime: created.getStartTime().toISOString(),
      endTime: created.getEndTime().toISOString()
    };
  } catch (err) {
    return { success: false, error: "Google Calendar event creation failed: " + err.toString() };
  }
}

/**
 * Bidirectional Sync between Personal OS and Google Calendar
 */
function handleSyncGoogleCalendar(localEvents, startDateStr, endDateStr) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const start = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDateStr ? new Date(endDateStr) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const googleEvents = calendar.getEvents(start, end);
    const importedEvents = [];

    googleEvents.forEach(ev => {
      const id = ev.getId();
      const isAllDay = ev.isAllDayEvent();
      const startTime = ev.getStartTime();
      const endTime = ev.getEndTime();
      const dateStr = Utilities.formatDate(startTime, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const startTimeStr = Utilities.formatDate(startTime, Session.getScriptTimeZone(), "HH:mm");
      const endTimeStr = Utilities.formatDate(endTime, Session.getScriptTimeZone(), "HH:mm");

      importedEvents.push({
        id: "gcal_" + id.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30),
        googleEventId: id,
        title: ev.getTitle(),
        description: ev.getDescription() || "",
        location: ev.getLocation() || "",
        date: dateStr,
        startTime: isAllDay ? undefined : startTimeStr,
        endTime: isAllDay ? undefined : endTimeStr,
        isAllDay: isAllDay,
        color: "blue",
        category: "google",
        source: "google_calendar"
      });
    });

    let exportedCount = 0;
    if (Array.isArray(localEvents)) {
      localEvents.forEach(local => {
        if (!local.googleEventId && local.title) {
          try {
            handleCreateGoogleCalendarEvent(local);
            exportedCount++;
          } catch (e) {}
        }
      });
    }

    return {
      success: true,
      importedEvents: importedEvents,
      exportedCount: exportedCount,
      totalGcalEvents: googleEvents.length,
      timeZone: Session.getScriptTimeZone()
    };
  } catch (err) {
    return { success: false, error: "Calendar sync error: " + err.toString() };
  }
}

/**
 * Run this function ONCE directly from the Apps Script editor toolbar (▶ Run)
 * to trigger the Google Calendar & Drive OAuth permission prompt!
 */
function authorizeCalendarAndDrive() {
  const cal = CalendarApp.getDefaultCalendar();
  Logger.log("✅ Successfully authorized Google Calendar: " + cal.getName());
  const drive = DriveApp.getRootFolder();
  Logger.log("✅ Successfully authorized Google Drive: " + drive.getName());
}
