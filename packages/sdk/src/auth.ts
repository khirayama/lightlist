import { onAuthStateChanged as firebaseOnAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import { User } from "./types";

type AuthStateChangeCallback = (user: User | null) => void;
type UnsubscribeFunction = () => void;

export function onAuthStateChange(
  callback: AuthStateChangeCallback,
): UnsubscribeFunction {
  return firebaseOnAuthStateChanged(auth, callback);
}
