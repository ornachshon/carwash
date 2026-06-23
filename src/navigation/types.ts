export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type OwnerStackParamList = {
  OwnerAddress: undefined;
  AddVehicle: undefined;
  RequestWash: undefined;
  JobStatus: { jobId?: string };
  RateUser: { jobId: string };
};

export type WasherStackParamList = {
  AvailabilityToggle: undefined;
  NearbyJobsMap: undefined;
  JobDetail: { jobId: string };
  JobStatusUpdate: { jobId: string };
  RateUser: { jobId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  RoleSelect: undefined;
  Owner: undefined;
  Washer: undefined;
  RateUser: { jobId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
