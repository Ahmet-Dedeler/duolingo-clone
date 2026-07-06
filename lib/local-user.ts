export const LOCAL_USER = {
  id: "local-user",
  name: "Ahmet",
  imageSrc: "/mascot.svg",
} as const;

export function getLocalUserId() {
  return LOCAL_USER.id;
}
