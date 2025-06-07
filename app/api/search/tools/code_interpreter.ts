import { z } from 'zod';
import { Daytona, SandboxTargetRegion } from '@daytonaio/sdk';

export const codeInterpreterSchema = z.object({
  title: z.string().describe('The title of the code snippet.'),
  code: z
    .string()
    .describe(
      'The Python code to execute. put the variables in the end of the code to print them. do not use the print function.',
    ),
  icon: z
    .enum(['stock', 'date', 'calculation', 'default'])
    .describe('The icon to display for the code snippet.'),
});

type Context = {
  serverEnv: any;
};

export async function executeCodeInterpreter(
  { code, title, icon }: z.infer<typeof codeInterpreterSchema>,
  context: Context,
) {
  console.log('Code:', code);
  console.log('Title:', title);
  console.log('Icon:', icon);

  const daytona = new Daytona()
  const sandbox = await daytona.create({
    image: "mind-analysis:1749032298",
    language: 'python',
    // target: SandboxTargetRegion.US,
    resources: {
      cpu: 4,
      memory: 8,
      disk: 10,
    },
    timeout: 300,
  })

  const execution = await sandbox.process.codeRun(code);

  console.log('Execution:', execution.result);
  console.log('Execution:', execution.artifacts?.stdout);

  let message = '';

  if (execution.result) {
    message += execution.result;
  }

  if (execution.artifacts?.stdout) {
    message += execution.artifacts.stdout;
  }

  if (execution.artifacts?.charts) {
    console.log('Chart:', execution.artifacts.charts[0]);
  }

  let chart;

  if (execution.artifacts?.charts) {
    chart = execution.artifacts.charts[0];
  }

  // map the chart to the correct format for the frontend and remove the png property
  const chartData = chart ? {
    type: chart.type,
    title: chart.title,
    elements: chart.elements,
    png: undefined
  } : undefined;

  await sandbox.delete();

  return {
    message: message.trim(),
    chart: chartData,
  };
}
