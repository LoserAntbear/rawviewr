import type { DecodeRunner } from '@features/image/imageDecoder/DecodeRunner';
import type { ImageExporter } from '@features/image/imageExport/ImageExporter';
import type { SourceReader } from '@features/image/sourceReader/SourceReader';
import type { InfoMessage } from '@features/infoMessage';
import type { SettingsController } from '@features/settings/SettingsController';
import type { ContentViewSession, UriOpener } from '@features/viewer';
import type { ContextKeyController } from '@features/vscode/contextKeys';

import type { MessageResolver, MessageResolverMap, ResolverContext } from '../../messaging/types';
import type { WebviewHostMessage, WebviewMessage } from '../types';

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
