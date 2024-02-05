<template>
  <div>
    <h5
      class="title-style"
    >
      {{ /* selectFoldersOrExercises$() */ }}
    </h5>

    <div v-if="!isTopicIdSet && bookmarksSize < 1">

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
 import { computed, ref } from 'kolibri.lib.vueCompositionApi';
 import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
 import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
 import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
 import { ChannelResource, ContentNodeKinds } from 'kolibri.resources';
 import { PageNames } from '../../../constants';
 import BookmarkIcon from '../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';
 import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
 import ResourceSelectionBreadcrumbs from './../LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';

 export default {
  name: 'ShowQuizChannels',
  components: {
      ContentCardList,
      BookmarkIcon,
      ResourceSelectionBreadcrumbs,
    },
  mixins: [commonCoreStrings],
  setup (props) {
      const channels = ref([]);
      const channelBookmarkPromises = [
          ChannelResource.fetchCollection({
            params: { has_exercises: true, available: true },
          }).then(response => {
            props.setResources(
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
          }),
        ];

        Promise.all(channelBookmarkPromises).then(() => {
          // When we don't have a topicId we're setting the value of useQuizResources.resources
          // to the value of the channels (treating those channels as the topics) -- we then
          // call this annotateTopicsWithDescendantCounts method to ensure that the channels are
          // annotated with their num_assessments and those without assessments are filtered out
            props.annotateTopicsWithDescendantCounts(channels.value.map(c => c.id)).then(() => {
            this.$emit('loadingChange', false);
          });
        });


    const {
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
      } = enhancedQuizManagementStrings;

    const { windowIsSmall } = useKResponsiveWindow();

    const contentList = computed(() => {
        /*
        if (!topicId.value) {
          return channels.value;
        }
        */
        this.$emit('loadContentList', props.resources);
        console.log("frommmmmm contentListtt");
        console.log(props.resources);
        return props.resources;

      });

      return {
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        contentList,
        windowIsSmall,
      }
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
    toggleTopicInWorkingResources: {
      type: Function,
      required: true
    },
    toggleSelected: {
      type:Function,
      required: true
    },
    fetchMoreQuizResources: {
      type: Function,
      required: true
    },
    annotateTopicsWithDescendantCounts: {
      type: Function,
      required: true
    },
    resources: {
      type: Array,
      required: true,
    },
    setResources: {
      type: Array,
      required: true
    }
  },
  computed: {
      isTopicIdSet() {
        return this.$route.params.topic_id;
      },
      getBookmarksLink() {
        return this.$router.getRoute(PageNames.BOOK_MARKED_RESOURCES);
      },
      channelsLink() {
        return this.$router.getRoute(PageNames.QUIZ_SELECT_RESOURCES);
      },
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
      topicsLink(topicId) {
        return this.topicListingLink({ ...this.$route.params, topicId });
      },
      topicListingLink({ topicId }) {
        return this.$router.getRoute(
          PageNames.QUIZ_SELECT_RESOURCES,
          { topicId },
          this.$route.query
        );
      },
  }
 }

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
