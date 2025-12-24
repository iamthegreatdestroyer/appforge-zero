/**
 * Workflow Orchestration Engine
 *
 * Provides:
 * - Workflow definition and execution
 * - Step coordination and sequencing
 * - Error handling and compensation (Saga pattern)
 * - Retry and timeout policies
 * - Execution history and replay
 */

import { EventBus, Event } from './event-bus';

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  action: string; // Function name or service method
  params?: Record<string, any>;
  retryAttempts?: number;
  timeout?: number; // milliseconds
  condition?: (context: WorkflowContext) => boolean; // Conditional execution
  compensation?: {
    action: string;
    params?: Record<string, any>;
  };
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  retryPolicy?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Workflow execution state
 */
export interface WorkflowExecution {
  id: string;
  definitionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';
  startTime: Date;
  endTime?: Date;
  context: WorkflowContext;
  stepExecutions: StepExecution[];
  compensations: CompensationExecution[];
  error?: string;
}

/**
 * Workflow context (shared state across steps)
 */
export interface WorkflowContext {
  workflowId: string;
  correlationId: string;
  userId?: string;
  data: Record<string, any>;
  outputs: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Step execution record
 */
export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  attempts: number;
  result?: any;
  error?: string;
}

/**
 * Compensation execution record
 */
export interface CompensationExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

/**
 * Action handler
 */
export type ActionHandler = (
  params: Record<string, any>,
  context: WorkflowContext
) => Promise<any>;

/**
 * Workflow engine
 */
export class WorkflowEngine {
  private definitions: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private actions: Map<string, ActionHandler> = new Map();
  private eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register workflow definition
   */
  registerWorkflow(definition: WorkflowDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  /**
   * Register action handler
   */
  registerAction(name: string, handler: ActionHandler): void {
    this.actions.set(name, handler);
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    definitionId: string,
    context: Partial<WorkflowContext> = {}
  ): Promise<WorkflowExecution> {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new Error(`Workflow definition not found: ${definitionId}`);
    }

    // Create execution
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId,
      status: 'pending',
      startTime: new Date(),
      context: {
        workflowId: definitionId,
        correlationId: context.correlationId || `corr_${Date.now()}`,
        userId: context.userId,
        data: context.data || {},
        outputs: {},
        metadata: context.metadata,
      },
      stepExecutions: [],
      compensations: [],
    };

    this.executions.set(execution.id, execution);

    try {
      // Publish workflow started event
      await this.publishEvent('workflow.started', {
        executionId: execution.id,
        workflowId: definitionId,
      });

      execution.status = 'running';

      // Execute steps
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];

        // Check condition
        if (step.condition && !step.condition(execution.context)) {
          const stepExecution: StepExecution = {
            stepId: step.id,
            status: 'skipped',
            startTime: new Date(),
            endTime: new Date(),
            attempts: 0,
          };
          execution.stepExecutions.push(stepExecution);
          continue;
        }

        // Execute step with retry
        try {
          const result = await this.executeStep(
            step,
            execution.context,
            definition.retryPolicy
          );

          const stepExecution: StepExecution = {
            stepId: step.id,
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            attempts: 1,
            result,
          };

          execution.stepExecutions.push(stepExecution);

          // Store result in context for next steps
          execution.context.outputs[step.id] = result;
        } catch (error) {
          const stepExecution: StepExecution = {
            stepId: step.id,
            status: 'failed',
            startTime: new Date(),
            endTime: new Date(),
            attempts: 1,
            error: error instanceof Error ? error.message : String(error),
          };

          execution.stepExecutions.push(stepExecution);

          // Trigger compensation
          await this.compensate(execution, definition);

          execution.status = 'compensated';
          execution.error = `Step ${step.id} failed: ${stepExecution.error}`;
          execution.endTime = new Date();

          await this.publishEvent('workflow.failed', {
            executionId: execution.id,
            workflowId: definitionId,
            error: execution.error,
          });

          return execution;
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();

      await this.publishEvent('workflow.completed', {
        executionId: execution.id,
        workflowId: definitionId,
        outputs: execution.context.outputs,
      });

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : String(error);

      await this.publishEvent('workflow.failed', {
        executionId: execution.id,
        workflowId: definitionId,
        error: execution.error,
      });

      return execution;
    }
  }

  /**
   * Execute single step with retry
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    retryPolicy?: any
  ): Promise<any> {
    const handler = this.actions.get(step.action);
    if (!handler) {
      throw new Error(`Action not found: ${step.action}`);
    }

    const maxAttempts = step.retryAttempts || retryPolicy?.maxAttempts || 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Create timeout promise
        const timeoutMs = step.timeout || 30000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Step timeout')),
            timeoutMs
          )
        );

        // Race between execution and timeout
        const result = await Promise.race([
          handler(step.params || {}, context),
          timeoutPromise,
        ]);

        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts) {
          const delay =
            (retryPolicy?.delayMs || 1000) *
            Math.pow(retryPolicy?.backoffMultiplier || 2, attempt - 1);

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Compensate failed workflow (Saga pattern)
   */
  private async compensate(
    execution: WorkflowExecution,
    definition: WorkflowDefinition
  ): Promise<void> {
    execution.status = 'compensating';

    // Reverse order of completed steps
    const completedSteps = execution.stepExecutions
      .filter((e) => e.status === 'completed')
      .reverse();

    for (const stepExecution of completedSteps) {
      const step = definition.steps.find((s) => s.id === stepExecution.stepId);
      if (!step || !step.compensation) {
        continue;
      }

      try {
        const handler = this.actions.get(step.compensation.action);
        if (handler) {
          await handler(step.compensation.params || {}, execution.context);

          execution.compensations.push({
            stepId: step.id,
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
          });
        }
      } catch (error) {
        execution.compensations.push({
          stepId: step.id,
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get execution
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(definitionId: string, limit: number = 100): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter((e) => e.definitionId === definitionId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Publish event
   */
  private async publishEvent(eventType: string, payload: any): Promise<void> {
    if (this.eventBus) {
      const event: Event = {
        id: `evt_${Date.now()}`,
        type: eventType as any,
        timestamp: new Date(),
        source: 'workflow-engine',
        version: 1,
        payload,
      };

      await this.eventBus.publish(event);
    }
  }
}

/**
 * Create workflow engine
 */
export function createWorkflowEngine(eventBus?: EventBus): WorkflowEngine {
  return new WorkflowEngine(eventBus);
}
