// middleware.ts
import { withAuth } from "next-auth/middleware";

// Protect all routes except the login page and API routes
export default withAuth({
  pages: {
    signIn: "/login", // redirect here if unauthenticated
  },
});

console.log("hereeee")
// Define which paths to protect
export const config = {
  matcher: ["/((?!login|api/auth).*)"], 
};
