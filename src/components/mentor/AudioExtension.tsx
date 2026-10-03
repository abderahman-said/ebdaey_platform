import { Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import AudioPlayerNode from "./AudioPlayerNode";

const AudioComponent = ({ node }: any) => (
  <NodeViewWrapper className="not-prose">
    <AudioPlayerNode src={node.attrs.src} />
  </NodeViewWrapper>
);

const AudioExtension = Node.create({
  name: "audio",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-audio-src") ||
          element.querySelector("audio")?.getAttribute("src") ||
          null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-audio-player]" }, { tag: "div[data-audio-src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, ...rest } = HTMLAttributes;

    return [
      "figure",
      mergeAttributes(rest, {
        class: "rt-audio-embed not-prose",
        "data-audio-player": "true",
        "data-audio-src": src,
      }),
      [
        "audio",
        {
          controls: "controls",
          preload: "metadata",
          crossorigin: "anonymous",
          src,
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioComponent as any);
  },

  addCommands() {
    return {
      setAudio:
        (attrs: { src: string }) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs }),
    } as any;
  },
});

export default AudioExtension;
