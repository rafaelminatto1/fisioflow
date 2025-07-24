
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import {
  getTaskSummary,
  searchKnowledgeBase,
  generatePatientReport,
  generateTreatmentPlan,
  recommendExercises,
  generateDailyBriefing,
  anonymizeAndCreateCaseStudy,
} from '/services/geminiService.js';
import { Patient, Task, Assessment, Exercise } from '/types.js';

let mockGenerateContent: any;

// A simple implementation of jest's `describe` and `it` for structure
const describe = (name: string, fn: () => void) => { 
    // In this mock environment, we execute the test suite immediately.
    // console.log(`DESCRIBE: ${name}`); 
    fn(); 
};
const it = (name: string, fn: () => Promise<void> | void) => { 
    // In this mock environment, we execute the test immediately.
    // console.log(`IT: ${name}`); 
    try {
        fn();
    } catch(e: any) {
        console.error(`Test ${name} failed`, e);
        throw e;
    }
};
const beforeEach = (fn: () => void) => { 
    // This is a dummy implementation for type-checking.
    // In our synchronous mock runner, we'll call it.
    fn();
};
const expect = (value: any) => ({
    toBe: (expected: any) => { if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`); },
    toEqual: (expected: any) => { if (JSON.stringify(value) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`); },
    toThrow: (error: any) => {
        let threw = false;
        try { value(); } catch (e: any) { threw = true; if(e.message !== error) throw new Error(`Expected to throw ${error} but threw ${e.message}`); }
        if (!threw) throw new Error('Expected to throw');
    },
    rejects: {
        toThrow: async (errorMsg: string) => {
            let threw = false;
            try { await value; } catch (e: any) { threw = true; if(e.message !== errorMsg) throw new Error(`Expected to throw ${errorMsg} but threw ${e.message}`); }
            if (!threw) throw new Error(`Expected promise to be rejected with ${errorMsg}`);
        }
    },
    toHaveBeenCalledTimes: (times: number) => {
        if (value.mock.calls.length !== times) throw new Error(`Expected to be called ${times} times, but was called ${value.mock.calls.length} times.`);
    }
});
const jest = { 
    fn: (implementation?: (...args: any[]) => any) => {
        const f: any = (...args: any[]) => { 
            f.mock.calls.push(args); 
            if (implementation) {
                return implementation(...args);
            }
            return f.mock.results.shift()?.value; 
        }; 
        f.mock = { calls: [], results: []}; 
        f.mockReturnValue = (v: any) => { f.mock.results.push({type: 'return', value: v}); return f;}; 
        f.mockResolvedValue = (v: any) => { f.mock.results.push({type: 'return', value: Promise.resolve(v)}); return f;}; 
        f.mockRejectedValue = (v: any) => { f.mock.results.push({type: 'return', value: Promise.reject(v)}); return f;}; 
        return f; 
    }, 
    mock: (moduleName: string, factory: () => any) => {}, 
    clearAllMocks: () => {
        if (mockGenerateContent && mockGenerateContent.mock) {
            mockGenerateContent.mock.calls = []; 
            mockGenerateContent.mock.results = [];
        }
    }
};

// Mock the entire @google/genai module
mockGenerateContent = jest.fn();

// This setup assumes a Jest-like environment.
// In a real project, you would have jest.mock(...) here.
// For this environment, we'll manually mock the implementation before tests.
const mockGoogleGenAI = {
    models: {
        generateContent: mockGenerateContent,
    },
};

(globalThis as any).GoogleGenAI = jest.fn(() => mockGoogleGenAI);


describe('Gemini Service', () => {
  beforeEach(() => {
    // Clear mock history before each test
    jest.clearAllMocks();
  });

  describe('getTaskSummary', () => {
    it('should return a summary on successful API call', async () => {
      const mockNote = 'Patient feels better.';
      const mockResponse = 'This is a good note. Keep it up!';
      mockGenerateContent.mockResolvedValue({ text: mockResponse });

      const result = await getTaskSummary(mockNote);
      expect(result).toBe(mockResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should throw a specific error if the AI response is empty', async () => {
        mockGenerateContent.mockResolvedValue({ text: '' });
        await expect(getTaskSummary('Test note')).rejects.toThrow('A IA retornou uma resposta vazia. Tente reformular sua anotação.');
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'API Error';
      mockGenerateContent.mockRejectedValue(new Error(errorMessage));
      
      await expect(getTaskSummary('Test note')).rejects.toThrow('Ocorreu um erro inesperado ao se comunicar com a IA. Tente novamente.');
    });

    it('should handle 429 rate limit errors with retry', async () => {
        const successResponse = { text: 'Success after retry' };
        mockGenerateContent.mock.results = [
             { type: 'return', value: Promise.reject(new Error('... 429 ...')) },
             { type: 'return', value: Promise.resolve(successResponse) }
        ];

        const result = await getTaskSummary('test');
        expect(result).toBe('Success after retry');
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('recommendExercises', () => {
    const mockAssessment: Partial<Assessment> = { diagnosticHypothesis: 'Knee pain' };
    const mockExercises: Exercise[] = [{ id: 'ex-1', name: 'Squat', description: '...', category: 'Fortalecimento', bodyPart: 'Joelho', videoUrl: '' }];
    
    it('should parse a valid JSON response correctly', async () => {
        const mockJsonResponse = `[{"id":"ex-1","name":"Squat","reason":"Strengthening"}]`;
        mockGenerateContent.mockResolvedValue({ text: mockJsonResponse });

        const result = await recommendExercises(mockAssessment, mockExercises);
        expect(result).toEqual([{ id: 'ex-1', name: 'Squat', reason: 'Strengthening' }]);
    });

    it('should parse a valid JSON response wrapped in markdown fences', async () => {
        const mockJsonResponse = "```json\n" +
                                 `[{"id":"ex-1","name":"Squat","reason":"Strengthening"}]` +
                                 "\n```";
        mockGenerateContent.mockResolvedValue({ text: mockJsonResponse });

        const result = await recommendExercises(mockAssessment, mockExercises);
        expect(result).toEqual([{ id: 'ex-1', name: 'Squat', reason: 'Strengthening' }]);
    });

    it('should throw an error for invalid JSON', async () => {
        const mockInvalidJsonResponse = `[{"id":"ex-1" ...`; // Malformed JSON
        mockGenerateContent.mockResolvedValue({ text: mockInvalidJsonResponse });

        await expect(recommendExercises(mockAssessment, mockExercises)).rejects.toThrow('Ocorreu um erro inesperado ao se comunicar com a IA. Tente novamente.');
    });

    it('should throw an error for a JSON response with incorrect structure', async () => {
        const mockWrongStructure = `[{"exercise_id":"ex-1","exercise_name":"Squat"}]`;
        mockGenerateContent.mockResolvedValue({ text: mockWrongStructure });

        await expect(recommendExercises(mockAssessment, mockExercises)).rejects.toThrow("A resposta da IA não está no formato JSON esperado.");
    });
  });

  describe('Other service functions (text response)', () => {
    const functionsToTest: {name: string, func: (...args: any[]) => Promise<string | GenerateContentResponse>, args: any[]}[] = [
        { name: 'searchKnowledgeBase', func: searchKnowledgeBase, args: ['query', 'knowledge'] },
        { name: 'generatePatientReport', func: generatePatientReport, args: [{} as Patient, [] as Task[]] },
        { name: 'generateTreatmentPlan', func: generateTreatmentPlan, args: [{} as Partial<Assessment>] },
    ];

    functionsToTest.forEach(({ name, func, args }) => {
        describe(name, () => {
            beforeEach(() => { jest.clearAllMocks(); });
            it('should return a response object on successful API call', async () => {
                const mockResponse = { text: 'AI response text' };
                mockGenerateContent.mockResolvedValue(mockResponse);
                
                const result = await func(...args);
                
                if (typeof result === 'string') {
                    expect(result).toBe(mockResponse.text);
                } else {
                    expect(result.text).toBe(mockResponse.text);
                }
                
                expect(mockGenerateContent).toHaveBeenCalledTimes(1);
            });

            it('should throw on API error', async () => {
                mockGenerateContent.mockRejectedValue(new Error('Generic Error'));
                await expect(func(...args)).rejects.toThrow('Ocorreu um erro inesperado ao se comunicar com a IA. Tente novamente.');
            });
        });
    });
  });
  
  describe('JSON parsing functions', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('generateDailyBriefing', () => {
        it('should return a parsed object on successful call', async () => {
          const mockResponseObject = { greeting: 'Hi', motivationalQuote: 'Go!', criticalAlerts:[], dailyFocus:[]};
          mockGenerateContent.mockResolvedValue({ text: JSON.stringify(mockResponseObject) });
          const result = await generateDailyBriefing('user', 'context');
          expect(result).toEqual(mockResponseObject);
          expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        });

        it('should throw an error for invalid JSON structure', async () => {
            const mockInvalidJson = `{"greeting":"Hi"}`; // Missing properties
            mockGenerateContent.mockResolvedValue({ text: mockInvalidJson });
            await expect(generateDailyBriefing('user', 'context')).rejects.toThrow("A resposta da IA não está no formato JSON esperado.");
        });
    });
    
    describe('anonymizeAndCreateCaseStudy', () => {
         const mockPatient = {} as Patient;
         const mockAssessments = [] as Assessment[];
        
        it('should return a parsed object on successful call', async () => {
            const mockResponse = { title: 'Case', summary: 'Summary', objectives: [], questions: [] };
            mockGenerateContent.mockResolvedValue({ text: JSON.stringify(mockResponse) });
            const result = await anonymizeAndCreateCaseStudy(mockPatient, mockAssessments);
            expect(result).toEqual(mockResponse);
        });

         it('should throw an error for invalid JSON structure', async () => {
            const mockInvalidJson = `{"title":"Case"}`; // Missing properties
            mockGenerateContent.mockResolvedValue({ text: mockInvalidJson });
            await expect(anonymizeAndCreateCaseStudy(mockPatient, mockAssessments)).rejects.toThrow("A resposta da IA não está no formato JSON esperado.");
        });
    });
  });

});