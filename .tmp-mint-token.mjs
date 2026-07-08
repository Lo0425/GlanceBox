import fs from "fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const content = fs.readFileSync("c:/Personal_Projects/Dashboard/.env.local", "utf8");
function get(key) {
  const m = content.match(new RegExp(key + '="([^"]*)"'));
  return m ? m[1] : null;
}

const app = initializeApp({
  credential: cert({
    projectId: get("FIREBASE_PROJECT_ID"),
    clientEmail: get("FIREBASE_CLIENT_EMAIL"),
    privateKey: get("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  }),
});
const adminAuth = getAuth(app);

const token = await adminAuth.createCustomToken("responsive-test-user");
fs.writeFileSync("c:/Personal_Projects/Dashboard/.tmp-token.txt", token);
console.log("token written, length", token.length);
