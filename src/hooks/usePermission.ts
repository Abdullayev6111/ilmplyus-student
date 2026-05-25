import useAuthStore from "../store/useAuthStore";

export const usePermission = (permissionName: string): boolean => {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);

  if (!permissionName) return true;
  if (user?.role === "admin") return true;

  return permissions.includes(permissionName);
};
