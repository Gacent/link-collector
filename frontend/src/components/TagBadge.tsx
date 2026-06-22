interface TagBadgeProps { name: string }

export default function TagBadge({ name }: TagBadgeProps) {
  return <span>{name}</span>;
}
