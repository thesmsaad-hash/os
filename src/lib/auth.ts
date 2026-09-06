import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const inputEmail = (credentials?.email || "").trim().toLowerCase();
        const inputPassword = (credentials?.password || "").trim();
        if (inputEmail === "smsaad05082003@gmail.com" && inputPassword === "victus") {
          return { id: "user_saad", name: "Saad", email: "smsaad05082003@gmail.com" };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
};
