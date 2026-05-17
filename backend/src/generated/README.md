# Pasta `src/generated`

## Para que servia

Esta pasta foi reservada para **código gerado automaticamente**, em especial o **cliente Prisma** (`@prisma/client`), criado ao correr `npx prisma generate` num projeto que usa Prisma como ORM.

O ficheiro `.gitignore` na raiz do `backend_mongoDB` ignora o conteúdo gerado aqui para não versionar binários/código enorme que muda a cada `generate`.

## Estado neste backend (MongoDB + Mongoose)

A API atual usa **Mongoose** e os modelos estão em **`src/models/index.ts`**. **Não há imports** desta pasta `generated` no código TypeScript atual.

Por isso a pasta pode ficar **vazia** no dia a dia; este `README.md` existe só para documentação e verificação.

## Se voltarem a usar Prisma neste projeto

1. Configurar `schema.prisma` e apontar a `output` para algo como `../src/generated` (ou o caminho que o Prisma exigir).
2. Executar `npx prisma generate` — os ficheiros aparecem aqui e continuam ignorados pelo Git (exceto este README, se mantiverem a exceção no `.gitignore`).

## Verificação rápida

- **Nada a “comentar” em código** nesta pasta enquanto estiver vazia.
- Se aparecerem ficheiros `.ts`/`.js` gerados, são **saída de ferramenta**; a documentação oficial está na ferramenta (Prisma, OpenAPI, etc.), não devem editar-se à mão salvo exceções documentadas pela equipa.
