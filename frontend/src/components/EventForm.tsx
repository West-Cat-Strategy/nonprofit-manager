import EventEditorForm, {
  type EventEditorFormProps,
} from '../features/events/components/EventEditorForm';

export type { EventEditorFormProps };

export default function EventForm(props: EventEditorFormProps) {
  return <EventEditorForm {...props} />;
}
