export function getConversationHistory(context) {
  return context
    .map((msg) => `${msg.is_from_me ? 'You' : 'Them'}: ${msg.text}`)
    .join('\\n');
}
