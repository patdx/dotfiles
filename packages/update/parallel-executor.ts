export interface Command {
  id: string
  command: () => Promise<any>
  condition: () => Promise<boolean>
  dependencies: string[]
  requiresSudo?: boolean
}

export class ParallelExecutor {
  private commands: Command[] = []
  private executedCommands = new Set<string>()
  private failedCommands = new Set<string>()

  addCommand(command: Command) {
    this.commands.push(command)
  }

  async execute() {
    console.log('Starting parallel update execution...')

    // Filter commands based on conditions
    const availableCommands = await this.filterAvailableCommands()

    // Execute in phases: non-sudo commands first, then sudo commands
    const nonSudoCommands = availableCommands.filter((cmd) => !cmd.requiresSudo)
    const sudoCommands = availableCommands.filter((cmd) => cmd.requiresSudo)

    // Execute non-sudo commands in parallel with dependency resolution
    if (nonSudoCommands.length > 0) {
      console.log(`Executing ${nonSudoCommands.length} non-sudo commands...`)
      await this.executeCommandsWithDependencies(nonSudoCommands)
    }

    // Execute sudo commands sequentially to avoid multiple password prompts
    if (sudoCommands.length > 0) {
      console.log('Executing system updates (may require sudo)...')
      for (const command of sudoCommands) {
        if (await this.shouldExecuteCommand(command)) {
          try {
            console.log(`Running: ${command.id}`)
            await this.executeCommand(command)
            this.executedCommands.add(command.id)
          } catch (error) {
            console.error(`Failed to execute ${command.id}:`, error)
            this.failedCommands.add(command.id)
          }
        }
      }
    }
  }

  private async filterAvailableCommands(): Promise<Command[]> {
    const available: Command[] = []

    for (const command of this.commands) {
      if (await command.condition()) {
        available.push(command)
      }
    }

    return available
  }

  private async executeCommandsWithDependencies(commands: Command[]) {
    const pendingCommands = new Set(commands.map((c) => c.id))
    const executingCommands = new Map<string, Promise<void>>()

    while (pendingCommands.size > 0 || executingCommands.size > 0) {
      // Find commands ready to execute (all dependencies satisfied)
      const readyCommands = commands.filter((cmd) =>
        pendingCommands.has(cmd.id) &&
        this.areDependenciesSatisfied(cmd) &&
        !executingCommands.has(cmd.id)
      )

      if (readyCommands.length === 0 && executingCommands.size === 0) {
        // Deadlock detection
        const remaining = Array.from(pendingCommands)
        console.warn(
          `Cannot execute commands due to unmet dependencies: ${
            remaining.join(', ')
          }`,
        )
        break
      }

      // Start execution of ready commands
      for (const command of readyCommands) {
        const promise = this.executeCommand(command)
          .then(() => {
            this.executedCommands.add(command.id)
            pendingCommands.delete(command.id)
          })
          .catch((error) => {
            console.error(`Failed to execute ${command.id}:`, error)
            this.failedCommands.add(command.id)
            pendingCommands.delete(command.id)
          })

        executingCommands.set(command.id, promise)
      }

      // Wait for at least one command to complete
      if (executingCommands.size > 0) {
        await Promise.race(Array.from(executingCommands.values()))

        // Clean up completed commands
        const completed = []
        for (const [id, promise] of executingCommands.entries()) {
          const result = await Promise.race([promise, Promise.resolve(null)])
          if (result !== null) {
            completed.push(id)
          }
        }

        for (const id of completed) {
          executingCommands.delete(id)
        }
      }
    }
  }

  private areDependenciesSatisfied(command: Command): boolean {
    return command.dependencies.every((dep) => this.executedCommands.has(dep))
  }

  private async shouldExecuteCommand(command: Command): Promise<boolean> {
    if (!await command.condition()) return false
    return this.areDependenciesSatisfied(command)
  }

  private async executeCommand(command: Command): Promise<void> {
    await command.command()
  }
}
