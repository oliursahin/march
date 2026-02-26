export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-900 text-sm">{message}</p>
    </div>
  );
}
