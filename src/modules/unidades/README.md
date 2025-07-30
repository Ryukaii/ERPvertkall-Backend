# Módulo de Unidades

Este módulo permite cadastrar, listar, editar e remover Unidades, contendo apenas os campos `nome` e `local` (ambos strings).

## Endpoints

Todas as rotas estão protegidas por autenticação JWT.

### Criar Unidade
- **POST** `/unidades`
- **Body:**
```json
{
  "nome": "Unidade Central",
  "local": "Rua Exemplo, 123"
}
```
- **Resposta:**
```json
{
  "id": "...",
  "nome": "Unidade Central",
  "local": "Rua Exemplo, 123",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Listar Unidades
- **GET** `/unidades`
- **Resposta:**
```json
[
  {
    "id": "...",
    "nome": "Unidade Central",
    "local": "Rua Exemplo, 123",
    "createdAt": "...",
    "updatedAt": "..."
  },
  ...
]
```

### Buscar Unidade por ID
- **GET** `/unidades/:id`
- **Resposta:** igual ao exemplo de criação

### Atualizar Unidade
- **PATCH** `/unidades/:id`
- **Body:** (qualquer campo pode ser enviado)
```json
{
  "nome": "Novo Nome"
}
```

### Remover Unidade
- **DELETE** `/unidades/:id`
- **Resposta:**
```json
{
  "message": "Unidade removida com sucesso"
}
```

## Observações
- Todos os campos são obrigatórios na criação.
- É necessário autenticação JWT para acessar as rotas. 