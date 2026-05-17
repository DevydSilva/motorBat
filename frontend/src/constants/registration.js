/** Token de permissão para cadastro de gestor no mock (alinhar com MANAGER_REGISTRATION_TOKEN no backend). */
export function getExpectedManagerRegistrationToken() {
  return (
    import.meta.env.VITE_MANAGER_REGISTRATION_TOKEN ||
    import.meta.env.VITE_MANAGER_TOKEN ||
    "batmotor-gestor-dev"
  );
}
