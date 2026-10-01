import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { createMultiAgentGraph } from './graph/stateGraph.js';

const fastify = Fastify({ logger: true });
fastify.register(cors, { origin: '*' });

const TaskSchema = z.object({
  task: z.string().min(5),
});

fastify.get('/api/health', async () => ({ status: 'healthy', service: 'multi-agent-orchestrator' }));

fastify.post('/api/orchestrate', async (request, reply) => {
  const { task } = TaskSchema.parse(request.body);
  const app = createMultiAgentGraph();

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  const result = await app.invoke({
    messages: [],
    task,
    nextStep: 'supervisor',
  });

  reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
  reply.raw.write('event: done\ndata: [DONE]\n\n');
  return reply.raw.end();
});

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) throw err;
  console.log(`🤖 Multi-Agent Orchestrator rodando em ${address}`);
});
