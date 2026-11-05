export abstract class CaptureTool<TCaptureOutput = unknown> {
  public abstract run(): Promise<TCaptureOutput>;
}
