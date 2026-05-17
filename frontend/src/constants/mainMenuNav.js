/**
 * Itens do menu lateral usados na pesquisa do Painel (atalhos para todas as áreas principais).
 */
export function getMainMenuNavItemsForSearch({ canManageUsers = false } = {}) {
  const items = [
    {
      to: "/",
      label: "Dashboard",
      keywords: ["painel", "inicio", "home", "principal", "batmotor"],
      icon: "ri-home-5-line"
    },
    {
      to: "/produtos",
      label: "Produtos",
      keywords: ["produto", "produtos", "catalogo", "inventario", "item", "itens"],
      icon: "ri-inbox-2-line"
    },
    {
      to: "/estoque",
      label: "Estoque",
      keywords: ["estoque", "stock", "material", "materiais", "armazem", "insumo"],
      icon: "ri-store-2-line"
    },
    {
      to: "/fornecedores",
      label: "Fornecedores",
      keywords: ["fornecedor", "fornecedores", "empresa", "cnpj", "transporte"],
      icon: "ri-truck-line"
    },
    {
      to: "/movimentacoes",
      label: "Movimentações",
      keywords: ["movimentacao", "movimentacoes", "entrada", "saida", "historico"],
      icon: "ri-bill-line"
    },
    {
      to: "/relatorios",
      label: "Relatórios",
      keywords: ["relatorio", "relatorios", "exportar", "pdf", "excel", "alerta"],
      icon: "ri-file-chart-line"
    },
    {
      to: "/sistema",
      label: "Sistema",
      keywords: ["sistema", "configuracao", "definicoes", "conta", "perfil", "ajustes"],
      icon: "ri-settings-3-line"
    }
  ];
  if (canManageUsers) {
    items.push({
      to: "/usuarios",
      label: "Usuários",
      keywords: ["usuario", "usuarios", "equipe", "pessoas", "acesso"],
      icon: "ri-group-line"
    });
  }
  return items;
}
