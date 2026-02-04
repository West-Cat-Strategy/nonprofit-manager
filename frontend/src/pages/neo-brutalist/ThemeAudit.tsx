import ThemeSelector from '../../components/ThemeSelector';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import BrutalButton from '../../components/neo-brutalist/BrutalButton';
import BrutalCard from '../../components/neo-brutalist/BrutalCard';
import BrutalInput from '../../components/neo-brutalist/BrutalInput';

export default function ThemeAudit() {
    return (
        <NeoBrutalistLayout>
            <div className="space-y-8 p-8">
                <div className="bg-app-surface border-4 border-app-border p-6 shadow-brutal">
                    <h1 className="text-4xl font-black mb-4 uppercase">Theme Audit Workbench</h1>
                    <p className="mb-6 font-bold">Use this page to verify all visual themes.</p>

                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-2">1. Theme Selector</h2>
                        <ThemeSelector />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Visual Primitives */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold mb-4">2. Visual Primitives</h2>

                            {/* Buttons */}
                            <div className="flex flex-wrap gap-4 mb-4">
                                <BrutalButton>Primary Action</BrutalButton>
                                <BrutalButton className="bg-loop-pink text-black">Pink Action</BrutalButton>
                                <BrutalButton disabled>Disabled</BrutalButton>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-4 max-w-sm mb-4">
                                <BrutalInput placeholder="Standard Input" />
                                <BrutalInput placeholder="With Icon" icon={<span>🔍</span>} />
                            </div>

                            {/* Colors */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="h-12 bg-[var(--loop-yellow)] border-2 border-app-border flex items-center justify-center font-bold text-xs">Yellow</div>
                                <div className="h-12 bg-[var(--loop-green)] border-2 border-app-border flex items-center justify-center font-bold text-xs">Green</div>
                                <div className="h-12 bg-[var(--loop-pink)] border-2 border-app-border flex items-center justify-center font-bold text-xs">Pink</div>
                                <div className="h-12 bg-[var(--loop-cyan)] border-2 border-app-border flex items-center justify-center font-bold text-xs">Cyan</div>
                                <div className="h-12 bg-[var(--loop-purple)] border-2 border-app-border flex items-center justify-center font-bold text-xs">Purple</div>
                                <div className="h-12 bg-[var(--loop-blue)] border-2 border-app-border flex items-center justify-center font-bold text-xs">Blue</div>
                            </div>
                        </div>

                        {/* Cards / Surfaces */}
                        <div>
                            <h2 className="text-xl font-bold mb-4">3. Surfaces & Typography</h2>
                            <BrutalCard className="mb-4">
                                <h3 className="text-lg font-mono mb-2">Card Component</h3>
                                <p className="mb-2">This is standard body text. It should have high contrast.</p>
                                <p className="text-sm opacity-75">This is secondary text opacity 75%.</p>
                                <div className="mt-4 p-4 bg-app-bg border-2 border-app-border">
                                    Nested container background.
                                </div>
                            </BrutalCard>

                            <BrutalCard color="green">
                                <h3 className="text-lg font-mono mb-2">Colored Card</h3>
                                <p>This card has a forced background color. Text inside should be readable.</p>
                            </BrutalCard>
                        </div>
                    </div>
                </div>
            </div>
        </NeoBrutalistLayout>
    );
}
