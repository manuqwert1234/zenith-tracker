// Kept in its own module (rather than inline in component files) so the
// impure Date.now()/Math.random() calls stay out of component/hook bodies,
// per the React Compiler purity rule.
export function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
