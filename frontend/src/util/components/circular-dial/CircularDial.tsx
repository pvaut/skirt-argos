
type CircularDialProps = {
  value: number; // between 0 and 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
};


const CircularDial: React.FC<CircularDialProps> = ({
  value,
  size = 100,
  strokeWidth = 10,
  color = 'color-mix(in srgb, var(--color-sp2) 50% ,transparent)',
  backgroundColor = 'color-mix(in srgb, var(--color-fg) 15% ,transparent)',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 1)); // clamp between 0 and 1

  return (
    <svg width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};


export default CircularDial;