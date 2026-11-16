# AURIX AI

Aplicativo web instalável (PWA) da AURIX AI, em português do Brasil.

## Recursos implementados

- Interface de conversa responsiva.
- Histórico local no navegador.
- Conversas com contexto enviado ao modelo.
- Anexos de imagens, PDF e TXT (até 8 MB por arquivo).
- Ditado por voz quando o navegador oferece suporte.
- Backend serverless em `/api/chat`; a chave do modelo nunca fica no navegador.
- Limite inicial simples de requisições por IP para reduzir abuso.

## Modelo de IA

Integração inicial com **Gemini 3.8 Flash** pela Gemini Developer API. A página oficial de preços informa uma faixa gratuita com limites para esse modelo. Os limites podem mudar e não são ilimitados. No nível gratuito, os prompts e respostas podem ser usados para melhorar produtos do Google; não envie dados sensíveis. Consulte:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/models

## Configuração necessária

1. Crie uma chave em https://aistudio.google.com/api-keys usando o nível gratuito, sem configurar faturamento.
2. No painel do projeto Vercel, adicione a variável de ambiente `GEMINI_API_KEY` com tipo Sensitive/Encrypted nos ambientes Production, Preview e Development.
3. Faça um novo deploy.

Não cole a chave no código, no GitHub ou em mensagens. Não habilite faturamento pago. O app responde com erro de configuração até a chave ser adicionada.

## Executar

Publique o repositório na Vercel para que a função `/api/chat.js` funcione. Abrir o HTML diretamente como arquivo não executa o backend.

## Limitações desta versão

- Sem cadastro/login e sem sincronização de histórico entre aparelhos.
- O histórico fica no armazenamento local do navegador.
- Limite de requisições por IP é básico e em memória; antes de abrir ao público, implementar rate limiting compartilhado, autenticação/quotas e monitoramento.
- O plano gratuito do provedor tem limites e política de dados próprios; não há garantia de uso ilimitado ou de equivalência com ChatGPT.
