import { resolveVerifiedIdentityProfile } from "../application/profileUseCases";
import type { VerifiedIdentity } from "../domain";
import { PostgresProfileRepository } from "../infrastructure/postgres/PostgresProfileRepository";
import { createProfileController } from "../presentation/http/controllers/profileController";

const profileRepository = new PostgresProfileRepository();

export const profileController = createProfileController(profileRepository);

export function resolveCurrentProfile(identity: VerifiedIdentity) {
  return resolveVerifiedIdentityProfile({
    identity,
    repository: profileRepository,
  });
}
