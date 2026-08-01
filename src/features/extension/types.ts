export type CommandDescriptor<
  Name extends string = string,
  args extends any[] = any[],
> = {
  name: Name;
  action: (...args: args) => void | Promise<void>;
};
