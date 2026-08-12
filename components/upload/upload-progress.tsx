import { Check, Loader2 } from "lucide-react";

const steps = ["Creating project", "Uploading image", "Starting AI generation"];

export function UploadProgress({ step, percent }: { step: number; percent: number }) {
  return (
    <div className="upload-progress" aria-live="polite">
      <div className="upload-progress-bar"><span style={{ width: `${percent}%` }} /></div>
      <ol>
        {steps.map((label, index) => (
          <li key={label} className={index < step ? "done" : index === step ? "active" : ""}>
            {index < step ? <Check size={14} /> : index === step ? <Loader2 className="spin" size={14} /> : <span>{index + 1}</span>}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

