export type CurrentProfile = {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName: string | null;
};

export type CurrentProfileActorIdentity = {
  profileId: string;
};

export type VerifiedIdentity = {
  supabaseUserId: string;
  email: string;
  displayName?: string;
};

export type Profile = CurrentProfile & {
  createdAt: Date;
  updatedAt: Date;
};
