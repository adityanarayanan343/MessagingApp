export interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profilePic?: string;
  status?: string;
} 