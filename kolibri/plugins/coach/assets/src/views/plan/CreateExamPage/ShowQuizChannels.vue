<template>
  <div>
    <h5
      class="title-style"
    >
      {{ /* selectFoldersOrExercises$() */ }}
    </h5>

    <div v-if="!isTopicIdSet && bookmarksSize">

      <p>{{ selectFromBookmarks$() }}</p>

      <div>
        <KRouterLink
          :appearanceOverrides="{
            width: '100%',
            textDecoration: 'none',
            color: $themeTokens.text
          }"
          :to="getBookmarksLink"
        >
          <div :class="windowIsSmall ? 'mobile-bookmark-container' : 'bookmark-container'">
            <BookmarkIcon :class="windowIsSmall ? 'mobile-bookmark-icon' : ''" />
            <div :class="windowIsSmall ? 'mobile-text' : 'text'">
              <h3>{{ coreString('bookmarksLabel') }}</h3>
              <p>{{ numberOfSelectedBookmarks$({ count: bookmarksSize }) }}</p>
            </div>
          </div>
        </KRouterLink>
      </div>
    </div>

    <ResourceSelectionBreadcrumbs
      v-if="isTopicIdSet"
      :ancestors="topic.ancestors"
      :channelsLink="channelsLink"
      :topicsLink="topicsLink"
    />

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
 import { PageNames } from '../../../constants';

 export default {
  name: 'ShowQuizChannels',
  setup () {
    const contentList = computed(() => {
        /*
        if (!topicId.value) {
          return channels.value;
        }
        */
        return resources.value;
      });
  },
  props: {
    bookmarksSize: {
        type: Number,
        required: true,
      },
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
    resources: {
      type: Array,
      required: true,
    }
  },
  methods: {
      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.QUIZ_SELECT_RESOURCES,
            params: {
              topic_id: content.id,
              classId: this.$route.params.classId,
              section_id: this.$route.params.section_id,
            },
          };
        }
        return {};
      },
  }
 }

</script>
