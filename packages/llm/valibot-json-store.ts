import * as v from 'valibot'

// const TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>

interface ValibotJsonStoreOptions<
  T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
> {
  schema: T
  fileName: string
}

export class ValibotJsonStore<
  const TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
> {
  private schema: TSchema
  private fileName: string
  private data: v.InferOutput<TSchema>
  private ready: Promise<void>

  constructor(options: ValibotJsonStoreOptions<TSchema>) {
    this.schema = options.schema
    this.fileName = options.fileName
    this.data = {}
    this.ready = this.init()
  }

  private async init() {
    try {
      const fileContent = await Deno.readTextFile(this.fileName)
      this.data = v.parse(this.schema, JSON.parse(fileContent))
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // File does not exist, create an empty object
        this.data = {}
      } else {
        throw error
      }
    }
  }

  public async getData(): Promise<v.InferOutput<TSchema>> {
    await this.ready
    return this.data
  }

  public async setData(
    dataOrCallback:
      | v.InferInput<TSchema>
      | ((currentData: v.InferOutput<TSchema>) => v.InferInput<TSchema>),
  ): Promise<void> {
    await this.ready
    const newData = typeof dataOrCallback === 'function'
      ? (dataOrCallback as (
        currentData: v.InferOutput<TSchema>,
      ) => v.InferInput<TSchema>)(this.data)
      : dataOrCallback

    const parsed = v.parse(this.schema, newData)
    this.data = parsed
    await Deno.writeTextFile(this.fileName, JSON.stringify(this.data, null, 2))
  }

  public async reset(): Promise<void> {
    await this.ready
    this.data = {}
    await Deno.writeTextFile(this.fileName, JSON.stringify(this.data, null, 2))
  }
}
