# AURIX IA

Aplicativo web instalável (PWA) da AURIX IA, em português do Brasil.

## Recursos

- Interface roxa responsiva, com a personagem AURIX em ilustração vetorial animada.
- Conversa com o modelo Gemini pela API protegida no servidor.
- Respostas faladas em português pelo sintetizador de voz do navegador.
- Ditado por voz quando o navegador oferece suporte.
- Anexos de imagens, vídeos, PDFs e arquivos TXT.
- Histórico local no navegador.
- Menu compacto com ações adicionais.
- PWA instalável e cache dos arquivos principais.

## Modelo de IA

Integração com Gemini 3.8 Flash (gemini-3.8-flash) pela Gemini Developer API. A disponibilidade, os limites, os preços e a política de dados dependem do Google e podem mudar. Consulte a [lista oficial de modelos](https://ai.google.dev/gemini-api/docs/models) e os [preços](https://ai.google.dev/gemini-api/docs/pricing).

## Configuração

1. Crie uma chave em [Google AI Studio](https://aistudio.google.com/api-keys).
2. No painel Vercel do projeto, adicione GEMINI_API_KEY como variável Sensitive/Encrypted nos ambientes necessários.
3. Faça um novo deploy.

Nunca coloque a chave no código do navegador, no GitHub ou em mensagens. Verifique os limites e os termos do provedor antes de disponibilizar o app ao público.

## Publicação

O projeto usa funções serverless em /api e deve ser publicado na Vercel. Abrir o HTML diretamente como arquivo não executa o backend.

## Limitações conhecidas

- A personagem atual é uma ilustração vetorial animada, não um avatar 3D renderizado em tempo real.
- A fala usa a voz disponível no navegador; não é ainda uma voz neural própria da AURIX.
- A animação durante a fala é visual e ainda não faz sincronização labial fonema a fonema.
- O histórico fica neste navegador/aparelho; ainda não há login nem sincronização entre dispositivos.
- O controle de requisições atual é simples e em memória. Antes de abrir ao público, adicionar autenticação, quotas compartilhadas, proteção contra abuso e monitoramento.
