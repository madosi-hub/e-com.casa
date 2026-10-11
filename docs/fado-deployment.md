# FADO e catálogo de iluminação em produção

As páginas, componentes e imagens estão incluídos neste commit. As rotas da aplicação incluem explicitamente os JSON do catálogo no pacote de produção.

## Importar os produtos

No checkout deste commit, com `DATABASE_URL` a apontar para o banco de produção já provisionado, executar:

```sh
npm run catalog:import:storefront
```

Este comando importa o FADO e os dez produtos de iluminação adicionais. Na primeira criação, publica os produtos e inicializa o stock confirmado de 20 000 unidades por produto. Nas importações seguintes, atualiza preços e apresentação, preservando stock, disponibilidade e publicação existentes. Não utiliza o seed completo do catálogo de parceiros.

Preços atuais: FADO 13,99 €, kit FADO + WiZ RGB + comando 20,99 €, WiZ RGB + comando 9 €. O kit poupa 2 € face à compra em separado.

O banco tem prioridade sobre os ficheiros quando já existe o produto. Portanto, importar também é necessário para atualizar preços de produtos anteriormente cadastrados. Uma campanha ativa configurada no admin pode alterar o preço final.

## Publicar

Publicar este commit pelo processo habitual de deploy. O build existente (`npm run build`) gera o cliente Prisma e a aplicação; não importa produtos automaticamente. Não há alteração de schema nesta entrega.

A página pode apresentar produtos pelo catálogo de ficheiros, mas as vendas com baixa de stock e o envio de avaliações exigem os produtos no banco. As integrações existentes de pagamentos e encomendas continuam a depender das variáveis de ambiente de produção.

## Validação

Não foram executados testes, lint, typecheck, build ou validações no navegador nesta entrega, conforme pedido. O funcionamento completo em produção ainda precisa de ser validado pelo responsável pelo deploy.
