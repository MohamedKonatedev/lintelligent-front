type Props = {
    src: string;
    title?: string;
  };
  
  export default function LivePlayer({
    src,
    title = "Live L'Intelligent TV",
  }: Props) {
    return (
      <div className="w-full overflow-hidden rounded-[18px] bg-black">
        <iframe
          src={src}
          title={title}
          className="block aspect-video w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }