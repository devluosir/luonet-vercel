export function CellErrorDot({ title }: { title: string }) {
  return (
    <span 
      className="inline-block ml-1 w-2 h-2 rounded-full bg-red-500 align-middle cursor-help" 
      title={title}
    />
  );
}
