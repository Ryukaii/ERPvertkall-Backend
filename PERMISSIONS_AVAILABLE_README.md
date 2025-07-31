# API de Permissões Disponíveis

## 🎯 Visão Geral

Esta API fornece uma listagem completa de todas as permissões disponíveis no sistema, organizadas por módulo e recurso. É especialmente útil para interfaces administrativas que precisam mostrar opções de permissões para configuração de usuários.

## 🚀 Rota Principal

### GET /users/permissions/available

**Descrição:** Lista todas as permissões disponíveis no sistema, organizadas por módulo.

**Permissão necessária:** Apenas administradores (`isAdmin: true`)

**Headers:**
```http
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

## 📋 Formato da Resposta

### Estrutura JSON
```json
[
  {
    "module": {
      "id": "string",
      "name": "string",
      "displayName": "string", 
      "description": "string"
    },
    "resources": [
      {
        "resource": "string",
        "actions": ["string"]
      }
    ]
  }
]
```

### Exemplo de Resposta Completa
```json
[
  {
    "module": {
      "id": "cm0000001",
      "name": "financeiro",
      "displayName": "Módulo Financeiro",
      "description": "Gestão de contas a pagar e receber"
    },
    "resources": [
      {
        "resource": "categories",
        "actions": ["read", "write"]
      },
      {
        "resource": "transactions", 
        "actions": ["read", "write"]
      },
      {
        "resource": "payment_methods",
        "actions": ["read", "write"]
      },
      {
        "resource": "recurring_payments",
        "actions": ["read", "write", "delete"]
      }
    ]
  },
  {
    "module": {
      "id": "cm0000002", 
      "name": "bancos",
      "displayName": "Módulo Bancário",
      "description": "Gestão de contas bancárias e transações"
    },
    "resources": [
      {
        "resource": "banks",
        "actions": ["read", "write"]
      },
      {
        "resource": "bank_transactions",
        "actions": ["read", "write"]
      },
      {
        "resource": "ai_categorization",
        "actions": ["read", "write"]
      },
      {
        "resource": "ofx_imports",
        "actions": ["read", "write", "delete"]
      }
    ]
  },
  {
    "module": {
      "id": "cm0000003",
      "name": "users", 
      "displayName": "Módulo de Usuários",
      "description": "Gestão de usuários e permissões"
    },
    "resources": [
      {
        "resource": "user_approval",
        "actions": ["read", "write"]
      }
    ]
  },
  {
    "module": {
      "id": "cm0000004",
      "name": "tags",
      "displayName": "Módulo de Tags",
      "description": "Gestão de tags do sistema"
    },
    "resources": [
      {
        "resource": "tags",
        "actions": ["read", "write"]
      }
    ]
  },
  {
    "module": {
      "id": "cm0000005",
      "name": "unidades",
      "displayName": "Módulo de Unidades",
      "description": "Gestão de unidades organizacionais"
    },
    "resources": [
      {
        "resource": "unidades", 
        "actions": ["read", "write"]
      }
    ]
  }
]
```

## 🔍 Detalhes dos Campos

### Module Object
- **id**: Identificador único do módulo
- **name**: Nome técnico do módulo (usado internamente)
- **displayName**: Nome amigável para exibição
- **description**: Descrição detalhada do módulo

### Resource Object
- **resource**: Nome técnico do recurso
- **actions**: Array de ações disponíveis para o recurso

### Actions Disponíveis
- **read**: Permissão de leitura/visualização
- **write**: Permissão de criação/edição
- **delete**: Permissão de exclusão (específica de alguns recursos)

## 🛠️ Como Usar no Frontend

### React/JavaScript Example
```javascript
// Buscar permissões disponíveis
const fetchAvailablePermissions = async () => {
  try {
    const response = await fetch('/users/permissions/available', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const permissions = await response.json();
    return permissions;
  } catch (error) {
    console.error('Erro ao buscar permissões:', error);
    throw error;
  }
};

// Processar para formulário
const processPermissionsForForm = (permissions) => {
  const formOptions = [];
  
  permissions.forEach(moduleData => {
    moduleData.resources.forEach(resource => {
      resource.actions.forEach(action => {
        formOptions.push({
          value: `${moduleData.module.name}:${resource.resource}:${action}`,
          label: `${moduleData.module.displayName} - ${resource.resource} (${action})`,
          module: moduleData.module.name,
          resource: resource.resource,
          action: action
        });
      });
    });
  });
  
  return formOptions;
};
```

### Vue.js Example
```vue
<template>
  <div>
    <h3>Selecionar Permissões</h3>
    <div v-for="moduleData in availablePermissions" :key="moduleData.module.id">
      <h4>{{ moduleData.module.displayName }}</h4>
      <div v-for="resource in moduleData.resources" :key="resource.resource">
        <label>{{ resource.resource }}</label>
        <div v-for="action in resource.actions" :key="action">
          <input 
            type="checkbox" 
            :value="`${moduleData.module.name}:${resource.resource}:${action}`"
            v-model="selectedPermissions"
          />
          {{ action }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      availablePermissions: [],
      selectedPermissions: []
    };
  },
  async mounted() {
    await this.loadPermissions();
  },
  methods: {
    async loadPermissions() {
      try {
        const response = await this.$http.get('/users/permissions/available');
        this.availablePermissions = response.data;
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
      }
    }
  }
};
</script>
```

## 🔧 Implementação Backend

### Lógica do Método
1. **Busca módulos ativos** do sistema
2. **Coleta permissões únicas** de todas as user_permissions existentes
3. **Agrupa por módulo e recurso**
4. **Retorna estrutura organizada**

### Características Técnicas
- **Performance**: Usa `distinct` para evitar duplicatas
- **Ordenação**: Módulos e recursos ordenados alfabeticamente
- **Completude**: Inclui todos os módulos ativos, mesmo sem permissões
- **Flexibilidade**: Estrutura facilita processamento frontend

## 📊 Casos de Uso

### 1. Interface de Configuração de Usuários
```javascript
// Mostrar checkboxes organizados por módulo
const renderPermissionCheckboxes = (permissions) => {
  return permissions.map(moduleData => (
    <div key={moduleData.module.id}>
      <h3>{moduleData.module.displayName}</h3>
      {moduleData.resources.map(resource => (
        <div key={resource.resource}>
          <h4>{resource.resource}</h4>
          {resource.actions.map(action => (
            <label key={action}>
              <input 
                type="checkbox" 
                value={`${moduleData.module.name}:${resource.resource}:${action}`}
              />
              {action}
            </label>
          ))}
        </div>
      ))}
    </div>
  ));
};
```

### 2. Validação de Permissões
```javascript
// Verificar se uma permissão específica existe
const isValidPermission = (permissions, module, resource, action) => {
  return permissions.some(moduleData => 
    moduleData.module.name === module &&
    moduleData.resources.some(res => 
      res.resource === resource && 
      res.actions.includes(action)
    )
  );
};
```

### 3. Seleção Inteligente
```javascript
// Selecionar todas as permissões de um módulo
const selectAllModulePermissions = (permissions, moduleName) => {
  const moduleData = permissions.find(m => m.module.name === moduleName);
  if (!moduleData) return [];
  
  const allPermissions = [];
  moduleData.resources.forEach(resource => {
    resource.actions.forEach(action => {
      allPermissions.push(`${moduleName}:${resource.resource}:${action}`);
    });
  });
  
  return allPermissions;
};
```

## 🚦 Códigos de Status

- **200 OK**: Permissões retornadas com sucesso
- **401 Unauthorized**: Token inválido ou expirado
- **403 Forbidden**: Usuário não é administrador
- **500 Internal Server Error**: Erro interno do servidor

## 🔒 Segurança

### Controle de Acesso
- **Apenas administradores** podem acessar esta rota
- **JWT obrigatório** no header Authorization
- **Verificação de admin** feita pelo AdminGuard

### Boas Práticas
1. **Cache no frontend** para evitar chamadas desnecessárias
2. **Validação local** antes de enviar permissões para o servidor
3. **Tratamento de erro** adequado para UX
4. **Loading states** durante requisições

## 📈 Performance

### Otimizações Implementadas
- **Distinct query** para evitar dados duplicados
- **Select específico** para reduzir payload
- **Agrupamento eficiente** em memória
- **Ordenação no banco** para consistência

### Recomendações
- **Cache** a resposta por alguns minutos no frontend
- **Lazy loading** se a lista for muito grande
- **Paginação** se necessário (futuro)

---

**API de Permissões Disponíveis** - Versão 1.0  
*Facilitando a gestão de permissões com interface amigável e dados estruturados.*