<template>

  <div class="select-resource">
    <div v-if="loading">
      <KCircularLoader />
    </div>
    <div v-else>
      <component
        :is="visibleComponent"
        :bookmarksSize="returnBookMarksLength()"
        :resources="resources"
        :viewMoreButtonState="viewMoreButtonState"
        :isSelectAllChecked="isSelectAllChecked"
        :selectionMetadata="selectionMetadata"
        :selectAllIndeterminate="selectAllIndeterminate"
        :toggleTopicInWorkingResources="toggleTopicInWorkingResources"
        :toggleSelected="toggleSelected"
        :fetchMoreQuizResources="fetchMoreQuizResources"
        :contentPresentInWorkingResourcePool="contentPresentInWorkingResourcePool"
        :hasCheckbox="hasCheckbox"
        :annotateTopicsWithDescendantCounts="annotateTopicsWithDescendantCounts"
        :setResources="setResources"
        @loadingChange="updateLoadingStatus"
        @bookmarksLength="returnBookMarksLength"
        @loadcontentList="loadContentList"
      />

      <div class="bottom-navigation">
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            {{ numberOfResources$({ count: channels.length }) }}
          </KGridItem>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              :text="coreString('saveChangesAction')"
              :primary="true"
              :disabled="!hasTopicId()"
              @click="saveSelectedResource"
            />
          </KGridItem>
        </KGrid>
      </div>
    </div>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { computed, ref, getCurrentInstance, watch, set } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../../constants';
  import useQuizResources from '../../../composables/useQuizResources';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import ShowBookMarkedResources from './ShowBookMarkedResources.vue';
  import ShowQuizChannels from './ShowQuizChannels.vue';

  export default {
    name: 'ResourceSelection',
    mixins: [commonCoreStrings],
    setup() {
      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const topicId = computed(() => route.value.params.topic_id);
       // The component which is shown to list the items
      const visibleComponent = computed(() => {
        if(!topicId.value) {
            if(route.value.name == PageNames.BOOK_MARKED_RESOURCES) {
                   // The component that fetches & lists bookmarks
                    return ShowBookMarkedResources;
            } else {
                   // The component that shows the Bookmarks link card
                   // and fetches & shows channels
                    console.log("ITs reaching here but not rendering compoennt");
                    return ShowQuizChannels;
            }
        } else {
            // The component that fetches and shows the children for the current
            // topicId value & the breadcrumbs
            // return ShowTopic;
            console.log("OR maybe hereee?");
            return;
        }
      });

      const {
        updateSection,
        activeSection,
        selectAllQuestions,
        workingResourcePool,
        addToWorkingResourcePool,
        removeFromWorkingResourcePool,
        resetWorkingResourcePool,
        contentPresentInWorkingResourcePool,
        initializeWorkingResourcePool,
      } = injectQuizCreation();

      initializeWorkingResourcePool();
      const {
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        //selectFoldersOrExercises$,
        numberOfSelectedResources$,
        numberOfResources$,
      } = enhancedQuizManagementStrings;

      // TODO let's not use text for this
      const viewMoreButtonState = computed(() => {
        if (hasMore.value) {
          return 'yes';
        } else {
          return 'no_more_results';
        }
      });



      //const { channels, loading, bookmarks, contentList } = useExerciseResources();

      const {
        hasCheckbox,
        topic,
        resources,
        loading: quizResourcesLoading,
        fetchQuizResources,
        fetchMoreQuizResources,
        hasMore,
      } = useQuizResources({ topicId });

      const _loading = ref(true);

      const channels = ref([]);
      const bookmarks = ref([]);
      const contentList = ref([]);
      const loading = computed(() => {
        return _loading.value || quizResourcesLoading.value;
      });

      if (topicId.value) {
        fetchQuizResources().then(() => {
          _loading.value = false;
        });
      }

      // This ought to be sure that we're updating our resources whenever the topicId changes
      // without remounting the whole component
      watch(topicId, () => {
        if (topicId.value) {
          fetchQuizResources();
        }
      });

      return {
        topic,
        topicId,
        resources,
        hasCheckbox,
        loading,
        hasMore,
        fetchMoreQuizResources,
        resetWorkingResourcePool,
        contentPresentInWorkingResourcePool,
        visibleComponent,
        contentList,
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        //selectFoldersOrExercises$,
        numberOfSelectedResources$,
        numberOfResources$,

        bookmarks,
        channels,
        viewMoreButtonState,
        updateSection,
        activeSection,
        selectAllQuestions,
        workingResourcePool,
        addToWorkingResourcePool,
        removeFromWorkingResourcePool,
      };
    },
    props: {
      closePanelRoute: {
        type: Object,
        required: true,
      },
    },
    computed: {

      isSelectAllChecked() {
        // Returns true if all the resources in the topic are in the working resource pool
        const workingResourceIds = this.workingResourcePool.map(wr => wr.id);
        return this.contentList.every(content => workingResourceIds.includes(content.id));
      },
      selectAllIndeterminate() {
        // Returns true if some, but not all, of the resources in the topic are in the working
        // resource
        const workingResourceIds = this.workingResourcePool.map(wr => wr.id);
        return (
          !this.isSelectAllChecked &&
          this.contentList.some(content => workingResourceIds.includes(content.id))
        );
      },
      selectionMetadata(/*content*/) {
        // TODO This should return a function that returns a string telling us how many of this
        // topic's descendants are selected out of its total descendants -- basically answering
        // "How many resources in the working resource_pool are from this topic?"
        // Tracked in https://github.com/learningequality/kolibri/issues/11741
        return () => '';
        // let count = 0;
        // let total = 0;
        // if (this.ancestorCounts[content.id]) {
        //   count = this.ancestorCounts[content.id].count;
        //   total = this.ancestorCounts[content.id].total;
        // }
        // if (count) {
        //   return this.$tr('selectionInformation', {
        //     count,
        //     total,
        //   });
        // }
        // return '';
        // return function() {
        //   console.log('Dynamic function called');
        // };
      },


      /*
      selectAllIsVisible() {
        TO BE IMPLEMENTED IN https://github.com/learningequality/kolibri/issues/11734
        Should only be visible if there are any checkboxes at all -- we'll only be showing
        checkboxes for Exercises, not topics
      },
      */
    },
    watch: {
      bookmarks(newVal) {
        this.bookmarksCount = newVal.length;
      },
    },
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },
      updateLoadingStatus(newLoadingStatus) {
        this._loading.value = newLoadingStatus;
      },
      loadContentList(content){
          console.log("succesfull got the resourcesss ehree");
          set(this.contentList, content);
      },
      returnBookMarksLength(bookmarkLength=0) {
        return bookmarkLength;
      },
      toggleSelected({ content, checked }) {
        if (checked) {
          this.addToSelectedResources(content);
        } else {
          this.removeFromWorkingResourcePool(content);
        }
      },
      addToSelectedResources(content) {
        this.addToWorkingResourcePool([content]);
      },
      toggleTopicInWorkingResources(isChecked) {
        if (isChecked) {
          this.isSelectAllChecked = true;
          this.addToWorkingResourcePool(this.contentList);
        } else {
          this.isSelectAllChecked = false;
          this.resetWorkingResourcePool();
        }
      },



      hasTopicId() {
        return Boolean(this.$route.params.topic_id);
      },
      saveSelectedResource() {
        this.updateSection({
          section_id: this.$route.params.section_id,
          resource_pool: this.workingResourcePool,
        });

        //Also reset workingResourcePool
        this.resetWorkingResourcePool();

        this.$router.replace(this.closePanelRoute);
      },
      // selectionMetadata(content) {
      //   if (content.kind === ContentNodeKinds.TOPIC) {
      //     const count = content.exercises.filter(exercise =>
      //       Boolean(this.selectedExercises[exercise.id])
      //     ).length;
      //     if (count === 0) {
      //       return '';
      //     }
      //     const total = content.exercises.length;
      //     return this.$tr('total_number', { count, total });
      //   }
      //   return '';
      // },
    },
  };

</script>


<style scoped lang="scss">

  @import '~kolibri-design-system/lib/styles/definitions';

  .select-resource {
    padding-bottom: 6em;
    margin-top: -4em;
  }

  .title-style {
    font-size: 1.4em;
    font-weight: 600;
  }

  .bookmark-container {
    display: flex;
    min-height: 141px;
    margin-bottom: 24px;
    border-radius: 2px;
    box-shadow: 0 1px 5px 0 #a1a1a1, 0 2px 2px 0 #e6e6e6, 0 3px 1px -2px #ffffff;
    transition: box-shadow 0.25s ease;
  }

  .mobile-bookmark-container {
    @extend %dropshadow-2dp;

    display: flex;
    max-width: 100%;
    min-height: 141px;
    margin: auto;
    margin-bottom: 24px;
    border-radius: 2px;

    .ease:hover {
      @extend %dropshadow-8dp;
      @extend %md-decelerate-func;

      transition: all $core-time;
    }
  }

  .mobile-bookmark-icon {
    left: 24px !important;
  }

  .mobile-text {
    margin-top: 20px;
    margin-left: 60px;
  }

  .bookmark-container:hover {
    box-shadow: 0 5px 5px -3px #a1a1a1, 0 8px 10px 1px #d1d1d1, 0 3px 14px 2px #d4d4d4;
  }

  .text {
    margin-left: 15rem;
  }

  .bottom-navigation {
    position: fixed;
    bottom: 0;
    width: 50%;
    padding: 10px;
    color: black;
    text-align: center;
    background-color: white;
  }

</style>
