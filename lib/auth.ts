import { LOCAL_USER_ID } from "@/constants";

export const LOCAL_USER = {
  id: LOCAL_USER_ID,
  firstName: "Ahmet",
  imageUrl: "/mascot.svg",
  email: "local@localhost",
};

export async function auth() {
  return { userId: LOCAL_USER.id };
}

export async function currentUser() {
  return {
    firstName: LOCAL_USER.firstName,
    imageUrl: LOCAL_USER.imageUrl,
    emailAddresses: [{ emailAddress: LOCAL_USER.email }],
  };
}
