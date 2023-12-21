import { v4 as uuidv4 } from 'uuid';
import isEqual from 'lodash/isEqual';
import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
import uniq from 'lodash/uniq';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { ChannelResource, ExamResource } from 'kolibri.resources';
import { validateObject, objectWithDefaults } from 'kolibri.utils.objectSpecs';
import { get, set } from '@vueuse/core';
import { computed, ref, provide, inject } from 'kolibri.lib.vueCompositionApi';
// TODO: Probably move this to this file's local dir
import selectQuestions from '../modules/examCreation/selectQuestions.js';
import { Quiz, QuizSection, QuizQuestion } from './quizCreationSpecs.js';

/** Validators **/
/* objectSpecs expects every property to be available -- but we don't want to have to make an
 * object with every property just to validate it. So we use these functions to validate subsets
 * of the properties. */

function validateQuiz(quiz) {
  return validateObject(quiz, Quiz);
}

/**
 * @param {QuizResource} o - The resource to check
 * @returns {boolean} - True if the resource is a valid QuizResource
 */
function isExercise(o) {
  return o.kind === ContentNodeKinds.EXERCISE;
}

/**
 * Composable function presenting primary interface for Quiz Creation
 */
export default function useQuizCreation(DEBUG = true) {
  // -----------
  // Local state
  // -----------

  /** @type {ref<Quiz>}
   * The "source of truth" quiz object from which all reactive properties should derive */
  const _quiz = ref(objectWithDefaults({}, Quiz));

  /** @type {ref<QuizSection>}
   * The section that is currently selected for editing */
  const _activeSectionId = ref(null);

  /** @type {ref<String[]>}
   * The question_ids that are currently selected for action in the active section */
  const _selectedQuestionIds = ref([]);

  /** @type {ref<Array>} A list of all channels available which have exercises */
  const _channels = ref([]);

  /** @type {ref<Number>} A counter for use in naming new sections */
  const _sectionLabelCounter = ref(1);

  //--
  // Debug Data Generators
  //--
  function _quizQuestions(num = 5) {
    const questions = [];
    for (let i = 0; i <= num; i++) {
      const overrides = {
        title: `Quiz Question ${i}`,
        question_id: uuidv4(),
      };
      questions.push(objectWithDefaults(overrides, QuizQuestion));
    }
    return questions;
  }

  function _quizSections(num = 5, numQuestions = 5) {
    const sections = [];
    for (let i = 0; i <= num; i++) {
      const overrides = {
        section_id: uuidv4(),
        section_title: `Test section ${i}`,
        questions: _quizQuestions(numQuestions),
      };
      sections.push(objectWithDefaults(overrides, QuizSection));
    }
    return sections;
  }

  function _generateTestData(numSections = 5, numQuestions = 5) {
    const sections = _quizSections(numSections, numQuestions);
    sections.forEach(section => {
      section.questions.forEach(question => {
        question.exercise_id = uuidv4();
      });
    });
    updateQuiz({ question_sources: sections });
    setActiveSection(sections[0].section_id);
  }

  // ------------------
  // Section Management
  // ------------------

  /**
   * @param   {QuizSection} section
   * @returns {QuizSection}
   * @affects _quiz - Updates the section with the given section_id with the given param
   * @throws {TypeError} if section is not a valid QuizSection
   **/
  function updateSection({ section_id, ...updates }) {
    const targetSection = get(allSections).find(section => section.section_id === section_id);
    if (!targetSection) {
      throw new TypeError(`Section with id ${section_id} not found; cannot be updated.`);
    }
    const { question_count } = updates;
    if (question_count) {
      if (question_count < (targetSection.question_count || 0)) {
        // If the question_count is being reduced, we need to remove any questions that are now
        // outside the bounds of the new question_count
        updates.questions = targetSection.questions.slice(0, question_count);
      } else if (question_count > (targetSection.question_count || 0)) {
        // If the question_count is being increased, we need to add new questions to the end of the
        // questions array
        const newQuestions = selectQuestions(
          question_count - (targetSection.question_count || 0),
          targetSection.resource_pool.map(r => r.content_id),
          targetSection.resource_pool.map(r => r.title),
          targetSection.resource_pool.map(r => r.questions.map(q => q.question_id)),
          get(_quiz).seed
        );
        updates.questions = [...targetSection.questions, ...newQuestions];
      }
    }

    set(_quiz, {
      ...get(quiz),
      // Update matching QuizSections with the updates object
      question_sources: get(allSections).map(section => {
        if (section.section_id === section_id) {
          return { ...section, ...updates };
        }
        return section;
      }),
    });
  }

  /**
   * @param {QuizQuestion[]} newQuestions
   * @affects _quiz - Updates the active section's `questions` property
   * @affects _selectedQuestionIds - Clears this back to an empty array
   * @throws {TypeError} if newQuestions is not a valid array of QuizQuestions
   * Updates the active section's `questions` property with the given newQuestions, and clears
   * _selectedQuestionIds from it. Then it resets _selectedQuestionIds to an empty array */
  // TODO WRITE THIS FUNCTION
  function replaceSelectedQuestions(newQuestions) {
    return newQuestions;
  }

  /** @returns {QuizSection}
   * Adds a section to the quiz and returns it */
  function addSection() {
    const newSection = objectWithDefaults({ section_id: uuidv4() }, QuizSection);
    const { sectionLabel$ } = enhancedQuizManagementStrings;
    newSection.section_title = `${sectionLabel$()} ${_sectionLabelCounter.value}`;
    _sectionLabelCounter.value++;
    updateQuiz({ question_sources: [...get(quiz).question_sources, newSection] });
    setActiveSection(newSection.section_id);
    return newSection;
  }

  /**
   * @throws {Error} if section not found
   * Deletes the given section by section_id */
  function removeSection(section_id) {
    const updatedSections = get(allSections).filter(section => section.section_id !== section_id);
    if (updatedSections.length === get(allSections).length) {
      throw new Error(`Section with id ${section_id} not found; cannot be removed.`);
    }
    if (updatedSections.length === 0) {
      const newSection = addSection();
      setActiveSection(newSection.section_id);
      updatedSections.push(newSection);
    } else {
      setActiveSection(get(updatedSections)[0].section_id);
    }
    updateQuiz({ question_sources: updatedSections });
  }

  /**
   * @param {string} [section_id]
   * @affects _activeSectionId
   * Sets the given section_id as the active section ID, however, if the ID is not found or is null
   * it will set the activeId to the first section in _quiz.question_sources */
  function setActiveSection(section_id = null) {
    set(_activeSectionId, section_id);
  }

  // ------------
  // Quiz General
  // ------------

  /** @affects _quiz
   * @affects _activeSectionId
   * @affects _channels - Calls _fetchChannels to bootstrap the list of needed channels
   * Adds a new section to the quiz and sets the activeSectionID to it, preparing the module for
   * use */
  function initializeQuiz(collection) {
    set(_quiz, objectWithDefaults({ collection }, Quiz));
    if (DEBUG) {
      _generateTestData();
    } else {
      const newSection = addSection();
      setActiveSection(newSection.section_id);
    }
    _fetchChannels();
  }

  /**
   * @returns {Promise<Quiz>}
   * @throws {Error} if quiz is not valid
   */
  function saveQuiz() {
    if (!validateQuiz(get(_quiz))) {
      throw new Error(`Quiz is not valid: ${JSON.stringify(get(_quiz))}`);
    }
    return ExamResource.saveModel({ data: get(_quiz) });
  }

  /**
   * @param  {Quiz} updates
   * @throws {TypeError} if updates is not a valid Quiz object
   * @affects _quiz
   * Validates the input type and then updates _quiz with the given updates */
  function updateQuiz(updates) {
    if (!validateQuiz(updates)) {
      throw new TypeError(`Updates are not a valid Quiz object: ${JSON.stringify(updates)}`);
    }
    set(_quiz, { ...get(_quiz), ...updates });
  }

  // --------------------------------
  // Questions / Exercises management
  // --------------------------------

  /** @param {QuizQuestion} question
   * @affects _selectedQuestionIds - Adds question to _selectedQuestionIds if it isn't
   * there already */
  function addQuestionToSelection(question_id) {
    set(_selectedQuestionIds, uniq([...get(_selectedQuestionIds), question_id]));
  }

  /**
   * @param {QuizQuestion} question
   * @affects _selectedQuestionIds - Removes question from _selectedQuestionIds if it is there */
  function removeQuestionFromSelection(question_id) {
    set(
      _selectedQuestionIds,
      get(_selectedQuestionIds).filter(id => id !== question_id)
    );
  }

  function toggleQuestionInSelection(question_id) {
    if (get(_selectedQuestionIds).includes(question_id)) {
      removeQuestionFromSelection(question_id);
    } else {
      addQuestionToSelection(question_id);
    }
  }

  function selectAllQuestions() {
    if (get(allQuestionsSelected)) {
      set(_selectedQuestionIds, []);
    } else {
      set(
        _selectedQuestionIds,
        get(activeQuestions).map(q => q.question_id)
      );
    }
  }

  /**
   * @affects _channels - Fetches all channels with exercises and sets them to _channels */
  function _fetchChannels() {
    ChannelResource.fetchCollection({ params: { has_exercises: true, available: true } }).then(
      response => {
        set(
          _channels,
          response.map(chnl => {
            return {
              ...chnl,
              id: chnl.root,
              title: chnl.name,
              kind: ContentNodeKinds.CHANNEL,
              is_leaf: false,
            };
          })
        );
      }
    );
  }

  // Utilities
  /**
   * @params  {string} section_id - The section_id whose resource_pool we'll use.
   * @returns {QuizQuestion[]}
   */
  function _getQuestionsFromSection(section_id) {
    const section = get(allSections).find(s => s.section_id === section_id);
    if (!section) {
      throw new Error(`Section with id ${section_id} not found.`);
    }
    return get(activeExercisePool).reduce((acc, exercise) => {
      return [...acc, ...exercise.questions];
    }, []);
  }

  // Computed properties
  /** @type {ComputedRef<Quiz>} The value of _quiz */
  const quiz = computed(() => get(_quiz));
  /** @type {ComputedRef<QuizSection[]>} The value of _quiz's `question_sources` */
  const allSections = computed(() => get(quiz).question_sources);
  /** @type {ComputedRef<QuizSection>} The active section */
  const activeSection = computed(() =>
    get(allSections).find(s => s.section_id === get(_activeSectionId))
  );
  /** @type {ComputedRef<QuizSection[]>} The inactive sections */
  const inactiveSections = computed(() =>
    get(allSections).filter(s => s.section_id !== get(_activeSectionId))
  );
  /** @type {ComputedRef<QuizResource[]>}   The active section's `resource_pool` */
  const activeResourcePool = computed(() => get(activeSection).resource_pool);
  /** @type {ComputedRef<ExerciseResource[]>} The active section's `resource_pool` - that is,
   *                                          Exercises from which we will enumerate all
   *                                          available questions */
  const activeExercisePool = computed(() => get(activeResourcePool).filter(isExercise));
  /** @type {ComputedRef<QuizQuestion[]>} All questions in the active section's `resource_pool`
   *                                      exercises */
  const activeQuestionsPool = computed(() => _getQuestionsFromSection(get(_activeSectionId)));
  /** @type {ComputedRef<QuizQuestion[]>} All questions in the active section's `questions` property
   *                                      those which are currently set to be used in the section */
  const activeQuestions = computed(() => get(activeSection).questions);
  /** @type {ComputedRef<String[]>} All question_ids the user has selected for the active section */
  const selectedActiveQuestions = computed(() => get(_selectedQuestionIds));
  /** @type {ComputedRef<QuizQuestion[]>} Questions in the active section's `resource_pool` that
   *                                         are not in `questions` */
  const replacementQuestionPool = computed(() => {});
  /** @type {ComputedRef<Array>} A list of all channels available which have exercises */
  const channels = computed(() => get(_channels));

  /** Handling the Select All Checkbox
   * See: remove/toggleQuestionFromSelection() & selectAllQuestions() for more */

  /** @type {ComputedRef<Boolean>} Whether all active questions are selected */
  const allQuestionsSelected = computed(() => {
    return isEqual(
      get(selectedActiveQuestions).sort(),
      get(activeQuestions)
        .map(q => q.question_id)
        .sort()
    );
  });

  /**
   * Deletes and clears the selected questions from the active section
   */
  function deleteActiveSelectedQuestions() {
    const { section_id, questions } = get(activeSection);
    const selectedIds = get(selectedActiveQuestions);
    const newQuestions = questions.filter(q => !selectedIds.includes(q.question_id));
    updateSection({ section_id, questions: newQuestions });
    set(_selectedQuestionIds, []);
  }

  const noQuestionsSelected = computed(() => get(selectedActiveQuestions).length === 0);
  /** @type {ComputedRef<String>} The label that should be shown alongside the "Select all" checkbox
   */
  const selectAllLabel = computed(() => {
    if (get(noQuestionsSelected)) {
      const { selectAllLabel$ } = enhancedQuizManagementStrings;
      return selectAllLabel$();
    } else {
      const { numberOfSelectedQuestions$ } = enhancedQuizManagementStrings;
      return numberOfSelectedQuestions$({ count: get(selectedActiveQuestions).length });
    }
  });

  /** @type {ComputedRef<Boolean>} Whether the select all checkbox should be indeterminate */
  const selectAllIsIndeterminate = computed(() => {
    return !get(allQuestionsSelected) && !get(noQuestionsSelected);
  });

  provide('saveQuiz', saveQuiz);
  provide('updateSection', updateSection);
  provide('replaceSelectedQuestions', replaceSelectedQuestions);
  provide('addSection', addSection);
  provide('removeSection', removeSection);
  provide('setActiveSection', setActiveSection);
  provide('initializeQuiz', initializeQuiz);
  provide('updateQuiz', updateQuiz);
  provide('addQuestionToSelection', addQuestionToSelection);
  provide('removeQuestionFromSelection', removeQuestionFromSelection);
  provide('channels', channels);
  provide('quiz', quiz);
  provide('allSections', allSections);
  provide('activeSection', activeSection);
  provide('inactiveSections', inactiveSections);
  provide('activeExercisePool', activeExercisePool);
  provide('activeQuestionsPool', activeQuestionsPool);
  provide('activeQuestions', activeQuestions);
  provide('selectedActiveQuestions', selectedActiveQuestions);
  provide('replacementQuestionPool', replacementQuestionPool);
  return {
    // Methods
    saveQuiz,
    updateSection,
    replaceSelectedQuestions,
    addSection,
    removeSection,
    setActiveSection,
    initializeQuiz,
    updateQuiz,
    deleteActiveSelectedQuestions,
    addQuestionToSelection,
    removeQuestionFromSelection,
    toggleQuestionInSelection,
    selectAllQuestions,

    // Computed
    channels,
    quiz,
    allSections,
    activeSection,
    inactiveSections,
    activeExercisePool,
    activeQuestionsPool,
    activeQuestions,
    selectedActiveQuestions,
    replacementQuestionPool,
    selectAllIsIndeterminate,
    selectAllLabel,
    allQuestionsSelected,
    noQuestionsSelected,
  };

  /*
  return {
    // Only what is needed where we want the rest of the module to be
    // provided
    saveQuiz,
    initializeQuiz,
  };
  */
}

export function injectQuizCreation() {
  const saveQuiz = inject('saveQuiz');
  const updateSection = inject('updateSection');
  const replaceSelectedQuestions = inject('replaceSelectedQuestions');
  const addSection = inject('addSection');
  const removeSection = inject('removeSection');
  const setActiveSection = inject('setActiveSection');
  const initializeQuiz = inject('initializeQuiz');
  const updateQuiz = inject('updateQuiz');
  const addQuestionToSelection = inject('addQuestionToSelection');
  const removeQuestionFromSelection = inject('removeQuestionFromSelection');
  const channels = inject('channels');
  const quiz = inject('quiz');
  const allSections = inject('allSections');
  const activeSection = inject('activeSection');
  const inactiveSections = inject('inactiveSections');
  const activeExercisePool = inject('activeExercisePool');
  const activeQuestionsPool = inject('activeQuestionsPool');
  const activeQuestions = inject('activeQuestions');
  const selectedActiveQuestions = inject('selectedActiveQuestions');
  const replacementQuestionPool = inject('replacementQuestionPool');

  return {
    // Methods
    saveQuiz,
    updateSection,
    replaceSelectedQuestions,
    addSection,
    removeSection,
    setActiveSection,
    initializeQuiz,
    updateQuiz,
    addQuestionToSelection,
    removeQuestionFromSelection,

    // Computed
    channels,
    quiz,
    allSections,
    activeSection,
    inactiveSections,
    activeExercisePool,
    activeQuestionsPool,
    activeQuestions,
    selectedActiveQuestions,
    replacementQuestionPool,
  };
}
