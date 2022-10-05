import { EventQuestion as EventQuestionInterface, ErrorCode } from "wiki-timeline-common";
import mongoose from "mongoose";
import { EventQuestionSchema } from "wiki-timeline-common/dist/models/EventQuestion.js";

const text =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam tristique sapien eget nisl feugiat tempor. Quisque sodales facilisis tortor, sed tristique neque venenatis at. Pellentesque quis neque aliquet, vulputate lorem sit amet, finibus mauris. Etiam faucibus mollis augue, et rhoncus purus laoreet at. Sed ultrices nulla at odio bibendum accumsan. Aenean euismod consectetur rutrum. Aliquam facilisis, quam sit amet ornare aliquet, lorem diam aliquam magna, ut consectetur lacus lectus non urna. Nunc pretium ante lacus, ac gravida lectus dapibus et. Pellentesque rhoncus placerat lacus vitae ultrices. Aenean blandit, purus ornare faucibus porttitor, leo risus feugiat augue, vitae imperdiet massa nisl a ante. Praesent nulla enim, fermentum ac erat non, tristique iaculis elit. Suspendisse auctor, enim non hendrerit tincidunt, dolor velit malesuada libero, at bibendum diam urna vitae massa. Pellentesque interdum lorem elit, eget pharetra metus molestie quis. Fusce laoreet, mi vel ultricies cursus, erat massa bibendum metus, accumsan pulvinar risus est nec lectus. Nullam auctor facilisis consectetur.";
export class EventQuestion implements EventQuestionInterface {
  text: string;
  year: number;
  locked: boolean;

  constructor() {
    this.text = "";
    this.year = NaN;
    this.locked = false;
  }
  async create(language: string) {
    const EventQuestionModel = mongoose.model(
      "EventQuestionModel",
      EventQuestionSchema,
      language
    );
    const EventQuestionAmount = await EventQuestionModel.count();

    // TODO: Only fetch from DB once. Find a mongoose query that checks if the text contains the year.
    let EventQuestionItem = await this.getFromDb(
      EventQuestionAmount,
      EventQuestionModel
    );
    while (EventQuestionItem.text.includes(EventQuestionItem.year.toString())) {
      EventQuestionItem = await this.getFromDb(
        EventQuestionAmount,
        EventQuestionModel
      );
    }
    this.text = EventQuestionItem.text;
    this.year = EventQuestionItem.year;
  }
  async getFromDb(
    EventQuestionAmount: number,
    EventQuestionModel: mongoose.Model<any>
  ) {
    const random = Math.floor(Math.random() * EventQuestionAmount);
    const EventQuestionItem = await EventQuestionModel.findOne().skip(random);
    if (
      !EventQuestionItem ||
      !EventQuestionItem.text ||
      !EventQuestionItem.year
    ) {
      throw ErrorCode.QuestionNotFound;
    }
    return EventQuestionItem;
  }
  static async initLockedQuestion(language: string) {
    const eventQuestion = new EventQuestion();
    await eventQuestion.create(language);
    eventQuestion.locked = true;
    return eventQuestion;
  }
  static checkQuestion(question: EventQuestion | null) {
    if (!question) {
      throw ErrorCode.QuestionNotFound;
    }
    return question;
  }
}
