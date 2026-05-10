import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#F43F5E'

const TRANSFORMER_PARTS = [
  { name: 'Self-attention',      desc: 'Each token attends to every other token in the context, learning which words are relevant to which. Multiple heads run in parallel, each learning different patterns (syntax, coreference, semantics).' },
  { name: 'Feed-forward layers', desc: 'After attention, each token position passes through the same two-layer MLP independently. These layers store factual associations — "Paris is the capital of France" lives somewhere in these weights.' },
  { name: 'Residual connections', desc: 'Each sub-layer adds its output to its input rather than replacing it. This lets gradients flow unchanged through many layers and lets the model trivially choose how much to update any given representation.' },
  { name: 'Layer normalisation',  desc: 'Applied before each sub-layer to keep activations on a stable scale. Without it, training very deep networks is numerically unstable.' },
]

const TRAINING_STEPS = [
  { step: '1', title: 'Pre-training',  desc: 'Next-token prediction over hundreds of billions of tokens from the web, books, and code. The model learns language structure, world knowledge, and reasoning patterns as a side effect of the compression objective.' },
  { step: '2', title: 'Instruction tuning', desc: 'Fine-tuning on curated examples of helpful behaviour: questions with good answers, tasks with good solutions. Transforms the base model from a text predictor into an assistant.' },
  { step: '3', title: 'RLHF', desc: 'Reinforcement Learning from Human Feedback. A reward model is trained to predict human preferences, then used to fine-tune the LLM via PPO, nudging it toward responses humans rate higher.' },
]

const AGENTIC = [
  { name: 'Tool use',   desc: 'LLMs can call external tools — search engines, code executors, APIs — and incorporate their results into responses.' },
  { name: 'Memory',     desc: 'External stores (vector databases, key-value stores) extend the fixed context window, allowing agents to retrieve relevant past information.' },
  { name: 'Planning',   desc: 'Chain-of-thought prompting and structured reasoning enable LLMs to decompose complex tasks into sub-goals before acting.' },
  { name: 'Multi-agent', desc: 'Multiple LLM instances collaborate: a planner delegates to specialists, a critic reviews, a synthesiser combines outputs.' },
]

const CHIPS = [
  'Transformer', 'Self-attention', 'Token', 'Context window', 'Temperature',
  'RLHF', 'Few-shot prompting', 'Chain-of-thought', 'Hallucination',
  'Embedding', 'Agentic AI', 'Tool use', 'RAG',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      <DefinitionCard color={COLOR}>
        Large language models are transformer-based neural networks trained on
        next-token prediction at massive scale. They learn to compress and
        reconstruct vast amounts of text — and as a side effect, learn grammar,
        facts, reasoning, and code. Scale transforms a simple prediction task
        into general-purpose intelligence.
      </DefinitionCard>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Inside the transformer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRANSFORMER_PARTS.map(({ name, desc }) => (
            <div key={name} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: COLOR }}>{name}</h3>
              <p className="text-sm leading-relaxed text-secondary">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          From pre-training to assistant
        </h2>
        <div className="space-y-3">
          {TRAINING_STEPS.map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 bg-surface rounded-xl p-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: COLOR }}>{step}</div>
              <div>
                <p className="text-sm font-semibold mb-0.5 text-primary">{title}</p>
                <p className="text-sm text-secondary leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Agentic AI
        </h2>
        <p className="text-sm text-secondary leading-relaxed mb-4">
          Beyond chat: LLMs augmented with tools, memory, and planning become agents
          that take sequences of actions to complete long-horizon tasks.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AGENTIC.map(({ name, desc }) => (
            <div key={name} className="bg-surface rounded-xl p-4">
              <p className="text-sm font-semibold mb-1" style={{ color: COLOR }}>{name}</p>
              <p className="text-sm text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">Key concepts</h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      <FactCard color={COLOR}>
        GPT-3 (2020) demonstrated that simply scaling model size, data, and compute
        produces emergent capabilities no one specifically trained for — including
        few-shot learning, code generation, and analogical reasoning. The insight
        catalysed the modern LLM race.
      </FactCard>

      <div className="rounded-xl bg-surface p-5">
        <p className="text-sm text-secondary">
          You have reached the end of the Concepts of AI series. The field moves
          fast — the models explored here were built by stacking the ideas from all
          eleven topics: search, metaheuristics, evolutionary computation,
          hyper-heuristics, fuzzy logic, and agent-based reasoning underpin the
          optimisation, fine-tuning, and multi-agent systems powering modern AI.
        </p>
      </div>
    </div>
  )
}
