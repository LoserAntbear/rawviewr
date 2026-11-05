import { GPU_CAPTURE_TOOLS, GPU_TRACE_EXTENSION_BY_TOOL, type GPUTraceTool } from '../definitions';

export function resolveCaptureTool(): GPUTraceTool {
  const tool = GPU_CAPTURE_TOOLS[process.platform as keyof typeof GPU_CAPTURE_TOOLS];

  if (!tool) {
    throw new Error(`No GPU capture tool configured for platform ${process.platform}`);
  }

  return tool;
}

export function resolveExtension(tool: GPUTraceTool): string {
  const ext = GPU_TRACE_EXTENSION_BY_TOOL[tool];

  if (!ext) {
    throw new Error(`No GPU trace extension configured for tool ${tool}`);
  }

  return ext;
}
