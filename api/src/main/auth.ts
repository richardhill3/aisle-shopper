import type { CurrentProfileResolver } from "../application/authUseCases";
import type { VerifiedIdentity } from "../domain";
import {
  resetSupabaseAuthClientForTests as resetSupabaseAuthClient,
  SupabaseAuthVerifier,
} from "../infrastructure/supabase/SupabaseAuthVerifier";
import { resolveCurrentProfile } from "./profile";

export const authVerifier = new SupabaseAuthVerifier();

export const currentProfileResolver: CurrentProfileResolver = {
  resolve(identity: VerifiedIdentity) {
    return resolveCurrentProfile(identity);
  },
};

export function resetSupabaseAuthClientForTests() {
  resetSupabaseAuthClient();
}
