import TodoList from "../components/TodoList";
import { withEventFlux } from "react-event-flux";

export default withEventFlux(["todoStore", ["todos", "filter"]])(TodoList);
