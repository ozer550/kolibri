<template>

  <div class="select-resource">
    <h5
      class="title-style"
    >
      {{ /* selectFoldersOrExercises$() */ }}
    </h5>


    <p>{{ selectFromBookmarks$() }}</p>


    <ContentCardList
      :contentList="contentList"
      :showSelectAll="true"
      :viewMoreButtonState="viewMoreButtonState"
      :selectAllChecked="isSelectAllChecked"
      :contentIsChecked="contentPresentInWorkingResourcePool"
      :contentHasCheckbox="hasCheckbox"
      :contentCardMessage="selectionMetadata"
      :contentCardLink="contentLink"
      :selectAllIndeterminate="selectAllIndeterminate"
      @changeselectall="toggleTopicInWorkingResources"
      @change_content_card="toggleSelected"
      @moreresults="fetchMoreQuizResources"
    />


  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { computed, ref } from 'kolibri.lib.vueCompositionApi';
  import { ContentNodeResource } from 'kolibri.resources';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';

  export default {
    name: 'ShowBookMarkedResources',
    components: {
      ContentCardList,
    },

    mixins: [commonCoreStrings],
    setup() {
      const bookmarks = ref([]);

      // Load up the BookMArks
      const channelBookmarkPromises = [
        ContentNodeResource.fetchBookmarks({ params: { limit: 25, available: true } }).then(
          data => {
            bookmarks.value = data.results ? data.results : [];
          }
        ),
      ];

      Promise.all(channelBookmarkPromises).then(() => {
        this.$emit('loadingChange', false);
        this.$emit('bookmarksLength', bookmarks.length);
      });

      const contentList = computed(() => {
        //Bookmark List i.e Bookmarks that are exercises
        return bookmarks.value
          .filter(item => item.kind === 'exercise')
          .map(item => ({ ...item, is_leaf: true }));
      });

      return {
        contentList,
      };
    },
    props: {
      viewMoreButtonState: {
        type: String,
        required: true,
      },
      isSelectAllChecked: {
        type: Boolean,
        default: false,
      },
      selectAllIndeterminate: {
        type: Boolean,
        default: false,
      },
      contentPresentInWorkingResourcePool: {
        type: Function, // ContentNode => Boolean
        required: true,
      },
      hasCheckbox: {
        type: Function, // ContentNode => Boolean
        required: true,
      },
      selectionMetadata: {
        type: Function, // ContentNode => String
        required: true,
      },
    },
    methods: {
      contentLink() {
        return this.$route;
      }
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

</style>
