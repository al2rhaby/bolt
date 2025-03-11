import { supabase } from './supabase';

interface TestInfo {
  title: string;
  type: 'TOEFL' | 'Unit';
  level?: 'Basic' | 'Intermedio' | 'Advanced';
  carrera?: string;
  semestre?: string;
  grupo?: string;
  profesor?: string;
  salon?: string;
  salons?: string[];
  audio_url?: string;
  section?: 'Listening' | 'Structure' | 'Reading';
  parent_test_id?: string;
}

export async function getTests() {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select(`
        *,
        questions!questions_test_id_fkey (
          id,
          type,
          text,
          choices,
          correct_answer,
          passage_id,
          passage_title,
          passage_content,
          underlined_words
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group TOEFL tests by parent test
    const groupedTests = data?.reduce((acc, test) => {
      if (test.type !== 'TOEFL') return acc;
      
      const parentId = test.parent_test_id || test.id;
      const testName = test.parent_test_id ? test.title.split(' - ')[0] : test.title;
      
      if (!acc[parentId]) {
        acc[parentId] = {
          id: parentId,
          title: testName,
          sections: [],
          created_at: test.created_at
        };
      }

      if (test.section) {
        acc[parentId].sections.push({
          name: test.section,
          questions: test.questions || []
        });
      }

      return acc;
    }, {} as Record<string, any>);

    return { success: true, tests: data, groupedTests: Object.values(groupedTests) };
  } catch (error) {
    console.error('Error fetching tests:', error);
    return { success: false, error };
  }
}

export async function createTest(testInfo: TestInfo, questions: any[] = []) {
  try {
    // Check for duplicate folder name
    if (testInfo.type === 'TOEFL' && !testInfo.parent_test_id) {
      const { data: existingTests, error: checkError } = await supabase
        .from('tests')
        .select('id')
        .eq('type', 'TOEFL')
        .eq('title', testInfo.title)
        .is('parent_test_id', null);

      if (checkError) throw checkError;

      if (existingTests && existingTests.length > 0) {
        return { 
          success: false, 
          error: 'A TOEFL test folder with this name already exists. Please choose a different name.' 
        };
      }
    }

    // Create parent test if this is a new TOEFL test section
    let parentTestId = testInfo.parent_test_id;
    
    if (!parentTestId && testInfo.type === 'TOEFL') {
      const { data: parentTest, error: parentError } = await supabase
        .from('tests')
        .insert([{
          title: testInfo.title,
          type: 'TOEFL',
          profesor: 'mohamed',
          created_by: 'mohamed'
        }])
        .select()
        .single();

      if (parentError) throw parentError;
      parentTestId = parentTest.id;
      
      // Store the current TOEFL test ID
      localStorage.setItem('currentTOEFLTestId', parentTest.id);
    }

    // Create the test/section
    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert([{
        title: testInfo.title,
        type: testInfo.type,
        level: testInfo.level,
        carrera: testInfo.carrera,
        semestre: testInfo.semestre,
        grupo: testInfo.grupo,
        profesor: testInfo.profesor || 'mohamed',
        salons: testInfo.salons,
        created_by: 'mohamed',
        audio_url: testInfo.audio_url,
        section: testInfo.section,
        parent_test_id: parentTestId
      }])
      .select()
      .single();

    if (testError) throw testError;

    if (questions.length > 0) {
      const questionsToInsert = questions.map(question => ({
        test_id: test.id,
        type: question.type || 'multiple',
        text: question.text,
        choices: question.choices || [],
        correct_answer: question.correctAnswer,
        passage_id: question.passage_id || null,
        passage_title: question.passage_title || null,
        passage_content: question.passage_content || null,
        underlined_words: question.underlinedWords || null
      }));

      // Insert questions one by one to ensure proper sequence numbering
      for (const question of questionsToInsert) {
        const { error: questionError } = await supabase
          .from('questions')
          .insert([question]);
          
        if (questionError) throw questionError;
      }
    }

    return { success: true, test };
  } catch (error) {
    console.error('Error creating test:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
}

export async function updateTest(id: string, updates: Partial<TestInfo>) {
  try {
    const { data, error } = await supabase
      .from('tests')
      .update({
        level: updates.level,
        carrera: updates.carrera,
        semestre: updates.semestre,
        grupo: updates.grupo,
        salons: updates.salons,
        profesor: updates.profesor || 'mohamed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, test: data };
  } catch (error) {
    console.error('Error updating test:', error);
    return { success: false, error };
  }
}

export async function saveTOEFLTest(section: string, questions: any[], audioUrl?: string) {
  try {
    // Get the parent test ID from localStorage
    const parentTestId = localStorage.getItem('currentTOEFLTestId');
    
    if (!parentTestId) {
      throw new Error('No parent test selected. Please create or select a TOEFL test first.');
    }

    // Get parent test info
    const { data: parentTest, error: parentError } = await supabase
      .from('tests')
      .select('title')
      .eq('id', parentTestId)
      .single();

    if (parentError) throw parentError;

    // Get the section test if it exists already
    const { data: existingSections, error: sectionFetchError } = await supabase
      .from('tests')
      .select('id')
      .eq('parent_test_id', parentTestId)
      .eq('section', section);
      
    if (sectionFetchError) throw sectionFetchError;
    
    let sectionId;
    
    // If section exists, use it, otherwise create a new one
    if (existingSections && existingSections.length > 0) {
      sectionId = existingSections[0].id;
      
      // Update the section with latest audio URL
      const { error: updateError } = await supabase
        .from('tests')
        .update({ 
          audio_url: audioUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId);
        
      if (updateError) throw updateError;
    } else {
      // Create a new section if it doesn't exist
      const { data: newSection, error: insertError } = await supabase
        .from('tests')
        .insert([{
          title: `${parentTest.title} - ${section} Section`,
          type: 'TOEFL',
          profesor: 'mohamed',
          created_by: 'mohamed',
          audio_url: audioUrl,
          section: section,
          parent_test_id: parentTestId
        }])
        .select()
        .single();
  
      if (insertError) throw insertError;
      sectionId = newSection.id;
    }

    // Handle questions if any exist
    if (questions.length > 0) {
      // Format questions based on section type
      for (const q of questions) {
        const baseQuestion = {
          test_id: sectionId,
          type: q.type || 'multiple',
          text: q.text,
          created_at: new Date().toISOString()
        };

        let questionData = {};
        
        switch (q.type) {
          case 'multiple':
            questionData = {
              ...baseQuestion,
              choices: q.choices || [],
              correct_answer: q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer
            };
            break;
          case 'underline':
            questionData = {
              ...baseQuestion,
              underlined_words: q.underlinedWords || q.underlined_words,
              correct_answer: q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer
            };
            break;
          default:
            questionData = {
              ...baseQuestion,
              choices: q.choices || [],
              correct_answer: q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer
            };
        }

        // Insert each question individually to ensure proper sequence numbering
        const { error: insertError } = await supabase
          .from('questions')
          .insert([questionData]);
  
        if (insertError) {
          console.error('Error inserting question:', insertError, 'Question data:', questionData);
          throw insertError;
        }
      }
    }

    return { success: true, sectionId };
  } catch (error) {
    console.error('Error saving TOEFL test:', error);
    return { success: false, error };
  }
}

export async function getTOEFLQuestions(section: string) {
  try {
    const parentTestId = localStorage.getItem('currentTOEFLTestId');
    
    if (!parentTestId) {
      return { success: true, tests: [] };
    }

    const { data: tests, error } = await supabase
      .from('tests')
      .select(`
        *,
        questions!questions_test_id_fkey (
          id,
          type,
          text,
          choices,
          correct_answer,
          passage_id,
          passage_title,
          passage_content,
          underlined_words,
          sequence_number
        )
      `)
      .eq('type', 'TOEFL')
      .eq('section', section)
      .eq('parent_test_id', parentTestId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, tests };
  } catch (error) {
    console.error('Error fetching TOEFL questions:', error);
    return { success: false, error };
  }
}

export async function deleteAllQuestions(section: string) {
  try {
    const parentTestId = localStorage.getItem('currentTOEFLTestId');
    
    if (!parentTestId) {
      throw new Error('No parent test selected');
    }

    const { data: sections, error: fetchError } = await supabase
      .from('tests')
      .select('id')
      .eq('type', 'TOEFL')
      .eq('section', section)
      .eq('parent_test_id', parentTestId);

    if (fetchError) throw fetchError;

    if (sections && sections.length > 0) {
      for (const sectionData of sections) {
        // Delete questions for this section
        const { error: deleteError } = await supabase
          .from('questions')
          .delete()
          .eq('test_id', sectionData.id);

        if (deleteError) throw deleteError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting questions:', error);
    return { success: false, error };
  }
}

export async function updateTestAudioUrl(testId: string, audioUrl: string | null) {
  try {
    const { error } = await supabase
      .from('tests')
      .update({ audio_url: audioUrl })
      .eq('id', testId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating audio URL:', error);
    return { success: false, error };
  }
}

export async function deleteTest(id: string) {
  try {
    // First get the test to check if it's a parent test
    const { data: test, error: fetchError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // If it's a parent test, delete all child sections first
    if (!test.parent_test_id) {
      // Get all child sections
      const { data: sections, error: sectionsQueryError } = await supabase
        .from('tests')
        .select('id')
        .eq('parent_test_id', id);
        
      if (sectionsQueryError) throw sectionsQueryError;
      
      // Delete questions for all sections
      if (sections && sections.length > 0) {
        for (const section of sections) {
          // Delete questions for this section
          const { error: questionsDeleteError } = await supabase
            .from('questions')
            .delete()
            .eq('test_id', section.id);
            
          if (questionsDeleteError) throw questionsDeleteError;
        }
      }
      
      // Now delete all child sections
      const { error: sectionsError } = await supabase
        .from('tests')
        .delete()
        .eq('parent_test_id', id);

      if (sectionsError) throw sectionsError;
    } else {
      // Delete questions for this section
      const { error: questionsDeleteError } = await supabase
        .from('questions')
        .delete()
        .eq('test_id', id);
        
      if (questionsDeleteError) throw questionsDeleteError;
    }

    // Delete the test itself
    const { error: deleteError } = await supabase
      .from('tests')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting test:', error);
    return { success: false, error };
  }
}