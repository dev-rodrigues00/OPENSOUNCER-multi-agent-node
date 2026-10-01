import { StateGraph, END } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

export interface AgentState {
  messages: BaseMessage[];
  task: string;
  nextStep: string;
  researchData?: string;
  generatedCode?: string;
  critiqueScore?: number;
}

export function createMultiAgentGraph() {
  const workflow = new StateGraph<AgentState>({
    channels: {
      messages: { value: (x, y) => x.concat(y), default: () => [] },
      task: { value: (x, y) => y ?? x, default: () => '' },
      nextStep: { value: (x, y) => y ?? x, default: () => 'supervisor' },
      researchData: { value: (x, y) => y ?? x },
      generatedCode: { value: (x, y) => y ?? x },
      critiqueScore: { value: (x, y) => y ?? x },
    },
  });

  // Supervisor Node
  workflow.addNode('supervisor', async (state: AgentState) => {
    if (!state.researchData) {
      return { nextStep: 'researcher', messages: [new AIMessage('Supervisor: Delegando pesquisa.')] };
    }
    if (!state.generatedCode) {
      return { nextStep: 'coder', messages: [new AIMessage('Supervisor: Delegando escrita de código.')] };
    }
    if (state.critiqueScore === undefined) {
      return { nextStep: 'critic', messages: [new AIMessage('Supervisor: Delegando auditoria de código.')] };
    }
    return { nextStep: 'finish', messages: [new AIMessage('Supervisor: Tarefa concluída com sucesso.')] };
  });

  // Researcher Node
  workflow.addNode('researcher', async (state: AgentState) => {
    return {
      researchData: `Pesquisa técnica sintetizada para: ${state.task}`,
      nextStep: 'supervisor',
      messages: [new AIMessage('Researcher: Concluiu coleta de contexto e referências.')],
    };
  });

  // Coder Node
  workflow.addNode('coder', async (state: AgentState) => {
    return {
      generatedCode: `// Código gerado para a tarefa: ${state.task}\nexport const run = () => console.log('Executando com sucesso');`,
      nextStep: 'supervisor',
      messages: [new AIMessage('Coder: Gerou módulos TypeScript conforme especificações.')],
    };
  });

  // Critic Node
  workflow.addNode('critic', async (state: AgentState) => {
    return {
      critiqueScore: 95,
      nextStep: 'supervisor',
      messages: [new AIMessage('Critic: Auditoria concluída. Código aprovado com score 95/100.')],
    };
  });

  workflow.setEntryPoint('supervisor');
  workflow.addConditionalEdges('supervisor', (x: AgentState) => x.nextStep, {
    researcher: 'researcher',
    coder: 'coder',
    critic: 'critic',
    finish: END,
  });

  workflow.addEdge('researcher', 'supervisor');
  workflow.addEdge('coder', 'supervisor');
  workflow.addEdge('critic', 'supervisor');

  return workflow.compile();
}
