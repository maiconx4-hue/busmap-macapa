# BusMap Macapá

BusMap Macapá — Aplicativo colaborativo de localização de ônibus em tempo real



1. Objetivo do projeto



Crie uma aplicação web responsiva chamada BusMap Macapá, destinada a ajudar a população de Macapá, Amapá, a consultar rotas de ônibus e acompanhar posições recentes compartilhadas voluntariamente por passageiros.



O aplicativo deve funcionar sem exigir login para consultar o mapa ou compartilhar localização. Entretanto, deve oferecer cadastro e login opcionais para quem desejar salvar seu progresso, conquistar medalhas, evoluir de nível e manter seu histórico de contribuições.



O projeto deve ter uma interface moderna, intuitiva, mobile-first e em português brasileiro, funcionando em navegadores de celulares, tablets e computadores.



Desenvolva uma aplicação funcional, conectada a um banco de dados real. Não apresente funcionalidades simuladas como se fossem operações reais.



2. Tecnologias e arquitetura



Utilize preferencialmente:



- React com TypeScript.

- Leaflet com OpenStreetMap para o mapa.

- Supabase e PostgreSQL para persistência de dados.

- Supabase Realtime para atualização das posições e das rotas.

- Supabase Auth para autenticação opcional dos passageiros e obrigatória para o administrador.

- Row Level Security (RLS) para controle de acesso ao banco de dados.

- Geolocation API do navegador para compartilhar GPS.

- Um serviço de roteamento compatível com OpenStreetMap, como OSRM, para calcular trajetos pelas vias.



Preserve a estrutura existente caso o projeto já tenha sido iniciado. Não substitua tecnologias ou arquivos sem necessidade.



3. Mapa público



A página principal deve ser acessível sem cadastro.



Implemente:



- Mapa interativo centralizado inicialmente em Macapá, AP.

- Rotas cadastradas e publicadas, desenhadas com suas cores.

- Marcadores para sessões de localização colaborativa ativas.

- Identificação da linha associada a cada compartilhamento.

- Filtros por linha e acesso aos detalhes de cada rota.

- Quantidade de rotas cadastradas e compartilhamentos ativos.

- Horário da última atualização de cada posição.

- Botão para centralizar o mapa na localização do visitante, mediante autorização.

- Painel de detalhes da linha selecionada.

- Interface adaptada a telas pequenas.



Todas as rotas publicadas devem ser carregadas do banco de dados. Alterações administrativas devem refletir automaticamente no mapa público.



Não invente posições de ônibus quando não houver colaboradores ativos. Apresente uma mensagem clara quando não houver posições disponíveis.



4. Cadastro e login opcionais dos passageiros



O acesso ao mapa deve continuar público e sem obrigatoriedade de cadastro.



Ofereça a possibilidade de criar uma conta ou entrar com uma conta existente para salvar o progresso de colaboração.



Implemente:



- Cadastro e login seguros.

- Recuperação de acesso.

- Opção de continuar como visitante.

- Explicação dos benefícios de criar uma conta.

- Área de perfil com nível, medalhas, pontuação e histórico de contribuições.

- Persistência do progresso após sair do aplicativo ou trocar de dispositivo.

- Opção de sair da conta.

- Opções para excluir a conta e solicitar a exclusão dos dados pessoais, respeitando as obrigações legais de retenção.



A criação da conta não pode ser um requisito para consultar rotas ou iniciar o compartilhamento de GPS.



Para visitantes sem conta, permita contribuições usando um identificador aleatório de sessão ou de instalação, com armazenamento local quando disponível.



Informe que o progresso de um visitante pode ser perdido ao limpar os dados do navegador, reinstalar o aplicativo ou trocar de dispositivo. Não prometa recuperação de progresso anônimo quando não houver um mecanismo de recuperação.



Se um visitante decidir criar uma conta, permita associar seu progresso anterior à conta de forma segura, quando houver evidências suficientes de que ele controla a sessão anônima. Não permita reivindicar o progresso de outro usuário apenas informando um identificador público.



5. Compartilhamento de localização por GPS



Implemente um fluxo completo:



1. O usuário seleciona a linha em que está viajando.

2. O aplicativo explica a finalidade do compartilhamento e como a localização será utilizada.

3. O usuário concede permissão para acessar o GPS.

4. Ao tocar em “Compartilhar localização”, inicia-se uma sessão.

5. O aplicativo envia as coordenadas ao backend em intervalos controlados.

6. O marcador aparece no mapa público e é atualizado em tempo real.

7. O usuário pode interromper o compartilhamento a qualquer momento.

8. Ao encerrar, o marcador deixa de ser considerado ativo.

9. Sessões sem atualização expiram automaticamente.



Implemente tratamento de permissões negadas, GPS indisponível, perda de conexão, reconexão, validação das coordenadas e limitação de requisições.



Considere inicialmente uma sessão inativa após 60 segundos sem atualização, com limite configurável no backend.



O usuário deve saber quando está compartilhando sua localização. Não prometa funcionamento contínuo com a página fechada, pois os navegadores móveis podem suspender o GPS em segundo plano.



Não exiba dados pessoais ou identificadores internos dos colaboradores no mapa.



Uma posição colaborativa não comprova, por si só, que uma pessoa está dentro de um ônibus. Apresente os marcadores como posições compartilhadas associadas a uma linha, sem alegar rastreamento oficial da frota.



6. Identificação do colaborador junto ao ônibus no mapa



Cada marcador de localização deve permitir visualizar informações resumidas sobre a contribuição.



Quando o colaborador tiver um perfil persistente, mostre junto ao ícone do ônibus um indicador compacto de nível ou medalha, sem prejudicar a leitura do mapa.



Exemplos:



- Ícone de ônibus + medalha de Bronze.

- Ícone de ônibus + medalha de Prata.

- Ícone de ônibus + medalha de Ouro.

- Ícone de ônibus + medalha de Platina.



O indicador deve ser discreto, legível em telas pequenas e diferenciado visualmente por nível.



Ao selecionar um marcador, abra um painel com:



- Linha associada.

- Medalha e nível do colaborador.

- Número de contribuições válidas, quando disponível.

- Experiência de colaboração acumulada.

- Horário da última atualização.

- Indicador de atualidade da posição.

- Estado da sessão.



Não revele nome real, e-mail, telefone ou outros dados pessoais do colaborador.



Para visitantes sem conta, utilize um identificador público genérico, como “Colaborador anônimo”, sem expor o identificador técnico da sessão. O marcador poderá mostrar um indicador de visitante, sem conceder uma reputação persistente que o sistema não consiga verificar.



Se a posição estiver desatualizada, exiba esse estado de forma clara, mesmo quando o colaborador tiver um nível elevado.



7. Sistema de contribuições, experiência e medalhas



Implemente um sistema de gamificação persistente e baseado na qualidade das contribuições.



O progresso deve considerar fatores como:



- Número de sessões válidas.

- Tempo de contribuição efetiva.

- Regularidade da participação.

- Qualidade e continuidade das coordenadas.

- Diversidade de sessões ao longo do tempo.



Não conte cada coordenada enviada como uma nova contribuição. Uma sessão deve ser avaliada como uma unidade, com regras para evitar pontuação ilimitada.



Crie inicialmente os seguintes níveis:



Bronze — Iniciante



Primeiras contribuições válidas para a comunidade.



Prata — Colaborador



Usuário com diversas sessões válidas e participação consistente.



Ouro — Explorador



Usuário com histórico de contribuições frequentes e de boa qualidade.



Platina — Embaixador



Colaborador experiente, com participação recorrente ao longo do tempo e histórico consistente.



Os critérios e limites para cada nível devem ser configuráveis, preferencialmente no backend.



Implemente:



- Pontuação de experiência.

- Medalha do nível atual.

- Barra de progresso para o próximo nível.

- Histórico de contribuições.

- Contador de sessões válidas.

- Data da primeira contribuição.

- Conquistas especiais.

- Persistência dos níveis e das medalhas.

- Atualização automática após uma contribuição válida.



O cálculo da experiência e a atribuição de medalhas devem ocorrer no backend. O cliente não pode escolher sua pontuação ou alterar diretamente seu nível.



Implemente proteções contra sessões artificiais, atualizações duplicadas, localização impossível, velocidade incompatível com o contexto e criação repetitiva de contas para acumular pontos.



Não penalize automaticamente o usuário apenas por apresentar GPS impreciso. Quando não for possível avaliar uma sessão com segurança, ela deve permanecer sem pontuação até ser validada ou descartada conforme as regras.



8. Confiabilidade dos compartilhamentos



O nível deve funcionar como um indicador de experiência comunitária, e não como uma garantia de que a localização atual é verdadeira.



Implemente indicadores separados:



1. Experiência do colaborador: nível e histórico de contribuições.

2. Atualidade da localização: há quanto tempo a posição foi atualizada.

3. Qualidade do sinal: precisão GPS informada pelo dispositivo e consistência das coordenadas.

4. Validação da sessão: se os dados recebidos passaram pelas verificações automáticas.



Exiba esses indicadores de forma compreensível.



Um colaborador experiente pode ter uma posição desatualizada ou imprecisa. Nesse caso, o mapa deve destacar a condição da posição e não sugerir que o nível elevado garante precisão.



Não apresente posições como verificadas por uma empresa de transporte, autoridade pública ou operador oficial sem uma integração real que comprove essa condição.



9. Perfil e painel do colaborador



Crie uma página de perfil para usuários autenticados, contendo:



- Nome público ou apelido escolhido.

- Medalha e nível atual.

- Experiência total.

- Progresso até o próximo nível.

- Quantidade de sessões válidas.

- Histórico resumido de contribuições.

- Conquistas desbloqueadas.

- Data de entrada na comunidade.

- Configurações de privacidade.

- Opções de gerenciamento da conta.



Não exiba publicamente o histórico detalhado de deslocamento do colaborador.



O usuário deve poder escolher um apelido público ou permanecer anônimo no mapa. O login não deve obrigar o uso do nome real como identidade pública.



10. Área administrativa privada



Crie uma área administrativa em uma rota própria, como "/admin", acessível exclusivamente ao criador do aplicativo.



Requisitos:



- Não oferecer cadastro público de administradores.

- Utilizar Supabase Auth.

- Autorizar somente a identidade administrativa explicitamente configurada.

- Verificar permissões no backend e no banco de dados.

- Aplicar políticas RLS para cada operação administrativa.

- Impedir que visitantes e passageiros alterem rotas, configurações ou permissões.

- Não confiar apenas em ocultar botões ou bloquear páginas no frontend.

- Não expor credenciais, tokens privilegiados ou chaves secretas no navegador.



A conta administrativa deve ser provisionada por um procedimento seguro de implantação.



O painel deve permitir criar, visualizar, editar, publicar, desativar e excluir rotas, conforme as regras de integridade do banco de dados.



Inclua um painel administrativo com contadores de rotas, sessões ativas, contribuições e estado dos serviços.



11. Editor de rotas



Disponibilize dois modos de criação de trajetos.



Modo A — Origem e destino



O administrador informa:



- Nome da linha.

- Código.

- Descrição.

- Cor.

- Origem.

- Destino.

- Sentido.

- Pontos de referência opcionais.



O sistema deve calcular um percurso pelas vias disponíveis utilizando um serviço de roteamento.



Exiba o percurso no mapa para revisão antes de salvar. Permita corrigir manualmente o trajeto para representar o itinerário real.



Modo B — Desenho manual



Permita desenhar o percurso ponto a ponto no mapa.



Implemente:



- Adição de pontos.

- Movimentação de pontos.

- Exclusão de pontos.

- Desfazer e refazer.

- Limpeza do traçado.

- Visualização da distância aproximada.

- Salvamento do percurso.

- Prévia antes da publicação.



O desenho manual deve funcionar mesmo quando o serviço de roteamento estiver indisponível.



Persistência das rotas



Cada rota deve armazenar:



- Identificador único.

- Nome e código.

- Descrição.

- Cor.

- Coordenadas de origem e destino.

- Geometria completa e ordenada.

- Método de criação.

- Sentido.

- Estado de publicação.

- Datas de criação e atualização.



Rotas em rascunho devem permanecer privadas. Apenas rotas publicadas ficam disponíveis no mapa público.



12. Banco de dados



Utilize PostgreSQL no Supabase, com tabelas organizadas, chaves estrangeiras, índices e restrições.



Crie, no mínimo:



- "routes": rotas e trajetos.

- "profiles": perfis públicos e preferências dos usuários registrados.

- "location_sessions": sessões temporárias de GPS.

- "location_updates": posições recebidas, com retenção limitada.

- "contributions": contribuições validadas.

- "user_progress": experiência, nível e progresso.

- "achievements": catálogo de medalhas e conquistas.

- "user_achievements": conquistas obtidas pelos usuários.

- "admin_users": identidade administrativa autorizada.

- "app_settings": parâmetros configuráveis.



Ajuste a estrutura se necessário para evitar redundância e garantir integridade.



Permita que sessões anônimas contribuam sem criar uma conta. Mantenha os registros anônimos separados dos perfis autenticados e permita associar progresso a uma conta somente mediante validação segura.



Aplique políticas RLS específicas para cada tabela. Não permita acesso público irrestrito às posições, ao histórico pessoal, à pontuação ou aos dados administrativos.



As sessões ativas devem ser expostas apenas por uma interface de leitura controlada, que apresente os campos mínimos necessários para o mapa.



Implemente limpeza periódica de sessões expiradas e posições antigas por meio de mecanismo de backend ou agendamento confiável.



13. Segurança e privacidade



O aplicativo deve seguir princípios de minimização de dados e privacidade desde a concepção.



Implemente:



- Consentimento explícito para compartilhamento do GPS.

- Botão para interromper a coleta.

- Transparência sobre a finalidade da localização.

- Coleta mínima de informações.

- Retenção limitada dos dados de localização.

- Exclusão ou anonimização quando aplicável.

- Proteção de contas e sessões.

- Limitação de requisições.

- Validação no backend.

- Políticas RLS.

- Proteção contra alteração de pontuação e nível.

- Política de privacidade compatível com a LGPD.



O login opcional não pode ser usado para impedir o acesso ao mapa público.



14. Desempenho e experiência de uso



Otimize o aplicativo para conexões móveis e aparelhos de menor capacidade.



Implemente atualização incremental de marcadores, controle de frequência de envio, gerenciamento correto das assinaturas Realtime, estados de carregamento e erro e mensagens compreensíveis.



Evite recarregar o mapa inteiro a cada atualização de GPS.



Mantenha os indicadores de nível e medalhas visíveis sem prejudicar a navegação.



15. Testes obrigatórios



Antes de concluir, verifique:



1. O mapa abre sem login.

2. As rotas publicadas aparecem automaticamente.

3. O administrador consegue criar trajetos calculados e manuais.

4. As rotas permanecem salvas após recarregar a página.

5. Um visitante consegue compartilhar GPS sem criar conta.

6. A posição aparece e se atualiza em outro dispositivo.

7. O compartilhamento pode ser interrompido.

8. Sessões expiradas deixam de aparecer como ativas.

9. Um usuário pode criar uma conta e manter seu progresso.

10. O progresso de uma conta permanece após novo login em outro dispositivo.

11. A experiência e as medalhas são calculadas pelo backend.

12. Visitantes não conseguem falsificar níveis ou pontuação por alterações no frontend.

13. Usuários anônimos não conseguem alterar rotas.

14. Usuários não autorizados não conseguem executar operações administrativas diretamente pela API.

15. A reputação do colaborador não oculta posições desatualizadas.

16. O aplicativo funciona em celular e computador.

17. Os erros de GPS, rede e autenticação são tratados adequadamente.



16. Entrega e evolução



Implemente primeiro a fundação: mapa público, banco de dados, rotas e área administrativa segura.



Depois, implemente o compartilhamento de GPS, as atualizações em tempo real e o sistema de contribuições, níveis e medalhas.



Não considere uma funcionalidade concluída apenas porque sua interface foi criada. Verifique se ela executa operações reais, persiste os dados e respeita as permissões.



Informe todas as configurações externas necessárias, as integrações pendentes, as tabelas criadas, as políticas RLS implementadas e os testes executados.



O resultado esperado é uma primeira versão funcional do BusMap Macapá, com acesso público sem login, conta opcional para evolução dos colaboradores, rotas administráveis com segurança e compartilhamento de localização colaborativa em tempo real.



( Deve existir na base do aplicação de forma fixa um espaço discreto para colocar um anúncio das Google ( para mobile)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/98985e06-91e8-4127-93c7-39e45b0e398b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
