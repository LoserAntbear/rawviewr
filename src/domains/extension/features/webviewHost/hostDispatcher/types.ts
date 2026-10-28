import type { Endian } from '@definitions/bits';
import type { DecodeRunner } from '@EXTENSION/features/image/imageDecoder/DecodeRunner';
import type { ImageExporter } from '@EXTENSION/features/image/imageExport/ImageExporter';
import type { SourceReader } from '@EXTENSION/features/image/sourceReader/SourceReader';
import type { InfoMessage } from '@EXTENSION/features/infoMessage';
import type { SettingsController } from '@EXTENSION/features/settings/SettingsController';
import type { ContentViewSession, UriOpener } from '@EXTENSION/features/viewer';
import type { ContextKeyController } from '@EXTENSION/features/vscode/contextKeys';
import type { DecodedFileOutcome, DecodedFileSegment, DecodedFileStart } from '@SHARED/features/image/imageDecoder/types';
import type { SourceLocation } from '@SHARED/features/image/sourceReader/types';
import type { WebviewHostMessage, WebviewMessage } from '@SHARED/features/messaging/protocol';
import type { MessageResolver, MessageResolverMap, ResolverContext } from '@SHARED/features/messaging/types';

export type StatusReporter = {
  handleMessage(message: InfoMessage): void;
};
export type HostMessageResolverInjectedContext = {
  readonly reader: SourceReader;
  readonly decodes: DecodeRunner;
  readonly exporter: ImageExporter;
  readonly messages: StatusReporter;
  readonly session: ContentViewSession;
  readonly settings: SettingsController;
  readonly contextKeys: ContextKeyController;

  readonly uriOpener?: UriOpener;
};

export type HostResolverContext = HostMessageResolverInjectedContext & ResolverContext<WebviewHostMessage>;

/**
 * A discriminated set to keep a more precise control
 * Probable can be done better, keeping as such for now.
 */
export type HostBoundMessageType =
  | 'app:ready'
  | 'app:status'
  | 'export:png'
  | 'probe:request'
  | 'gallery:openItem'
  | 'view:fieldFocus'
  | 'sources:request:decode'
  | 'decode:options:snapshot';

type HostResolvers = MessageResolverMap<WebviewMessage, HostResolverContext>;

export type HostMessageResolverMap = HostResolvers & Required<Pick<HostResolvers, HostBoundMessageType>>;

export type HostMessageResolver<K extends WebviewMessage['type'] = WebviewMessage['type']> =
  MessageResolver<WebviewMessage, HostResolverContext, K>;

export type ProbeRequestMessage = {
  id: string;
  endian: Endian;
  location: SourceLocation;
};
export type DecodeStage = 'start' | 'progress' | 'ready';
export type DecodeMessageByStage = {
  start: { type: 'images:decode:start'; images: DecodedFileStart[] };
  ready: { type: 'images:decode:ready'; images: DecodedFileOutcome[] };
  progress: { type: 'images:decode:progress'; images: DecodedFileSegment[] };
};
export type DecodeBatches = {
  [S in DecodeStage]: DecodeMessageByStage[S]['images'];
};
